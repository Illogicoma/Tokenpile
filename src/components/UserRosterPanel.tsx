import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Trash2,
  ChevronDown,
  ChevronUp,
  Coins,
  ChevronsUpDown,
  RotateCcw,
  Trophy,
  Zap,
  Flame,
  Radio,
  Sparkles,
  Terminal,
  Repeat,
  X,
  Minus,
  Search
} from 'lucide-react';
import type { UserRosterItem, BetOutcome } from '../types/betting';
import { IconDisplay } from './IconDisplay';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { getPodiumColor } from '../utils/podiumColors';
import { AnimatedTokenCounter } from './AnimatedTokenCounter';

interface UserRosterPanelProps {
  users: UserRosterItem[];
  outcomes: BetOutcome[];
  onBet: (userId: string, amount: number, outcomeId: string) => void;
  onOpenTokenMaker: (user: UserRosterItem) => void;
  onSimulateRandomBets: (count: number) => void;
  isSwarmActive?: boolean;
  swarmCount?: number;
  onToggleSwarm?: () => void;
  onAddUser: (name: string, emoji?: string) => void;
  onRemoveUser?: (userId: string) => void;
  onUpdateUserPoints?: (userId: string, points: number) => void;
  onSetAllPoints?: (amount: number) => void;
  onAddPointsToAll?: (amount: number) => void;
  onClearAllPoints?: () => void;
  isDebugMode?: boolean;
  onToggleDebugMode?: (enabled: boolean) => void;
  title?: string;
  emoji?: string;
  onUpdateTitle?: (title: string) => void;
  onOpenIconEditor?: () => void;
  isAdmin?: boolean;
}

const getTierColor = (tokens: number): string => {
  if (tokens >= 50000) return '#f43f5e'; // Colossal / Rose
  if (tokens >= 20000) return '#f59e0b'; // Legendary / Amber
  if (tokens >= 10000) return '#8b5cf6'; // Mythic / Purple
  if (tokens >= 5000) return '#06b6d4';  // Platinum / Cyan
  if (tokens >= 2000) return '#eab308';  // Gold
  if (tokens >= 500) return '#94a3b8';   // Silver
  return '#10b981';                      // Starter / Emerald Green
};

const getTierName = (tokens: number): string => {
  if (tokens >= 50000) return 'Colossal';
  if (tokens >= 20000) return 'Legend';
  if (tokens >= 10000) return 'Mythic';
  if (tokens >= 5000) return 'Plat';
  if (tokens >= 2000) return 'Gold';
  if (tokens >= 500) return 'Silver';
  return 'Starter';
};

const formatCompactPts = (pts: number): string => {
  if (pts >= 1000000) return `${(pts / 1000000).toFixed(1)}M`;
  if (pts >= 10000) return `${Math.round(pts / 1000)}k`;
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`;
  return String(pts);
};

export const UserRosterPanel: React.FC<UserRosterPanelProps> = ({
  users,
  outcomes,
  onBet,
  onOpenTokenMaker,
  onSimulateRandomBets,
  isSwarmActive = false,
  swarmCount = 0,
  onToggleSwarm,
  onAddUser,
  onRemoveUser,
  onUpdateUserPoints,
  onSetAllPoints,
  onAddPointsToAll,
  onClearAllPoints,
  isDebugMode = false,
  onToggleDebugMode,
  title = 'Viewers',
  emoji = '👥',
  onUpdateTitle,
  onOpenIconEditor,
  isAdmin = true
}) => {
  const [selectedUserOutcomes, setSelectedUserOutcomes] = useState<Record<string, string>>({});
  const [userBetInputs, setUserBetInputs] = useState<Record<string, string>>({});
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortMode, setSortMode] = useState<'default' | 'winnings'>('default');

  // Winners Podium state
  const [isPodiumVisible, setIsPodiumVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anytoken_viewer_podium_visible') === 'true';
    } catch {
      return false;
    }
  });

  const [podiumLimit, setPodiumLimit] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('anytoken_viewer_podium_limit');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (parsed >= 1 && parsed <= 10) return parsed;
      }
    } catch { }
    return 3;
  });

  const [podiumMode, setPodiumMode] = useState<'race' | 'leaderboard'>('race');
  const [spotlightedUserId, setSpotlightedUserId] = useState<string | null>(null);

  // In live mode (isDebugMode=false), show only real viewers; in debug mode show all
  const baseUsers = useMemo(() => {
    return isDebugMode ? users : users.filter(u => !u.isMockUser);
  }, [isDebugMode, users]);

  // Recent race winning viewers (filtered by active mode)
  const recentWinners = useMemo(() => {
    return baseUsers
      .filter(u => u.lastResult?.type === 'win')
      .sort((a, b) => {
        const placeA = a.lastResult?.place || 999;
        const placeB = b.lastResult?.place || 999;
        if (placeA !== placeB) return placeA - placeB;
        return (b.lastResult?.amount || 0) - (a.lastResult?.amount || 0);
      });
  }, [baseUsers]);

  // Overall leaderboard viewers (by token count, filtered by active mode)
  const leaderboardUsers = useMemo(() => {
    return [...baseUsers].sort((a, b) => b.tokens - a.tokens);
  }, [baseUsers]);

  // Auto-reveal podium dock when new race winners arrive
  const prevWinnersCountRef = useRef<number>(0);
  useEffect(() => {
    if (recentWinners.length > 0 && prevWinnersCountRef.current === 0) {
      setIsPodiumVisible(true);
      setPodiumMode('race');
    }
    prevWinnersCountRef.current = recentWinners.length;
  }, [recentWinners.length]);

  const handleSetPodiumLimit = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count));
    setPodiumLimit(clamped);
    try {
      localStorage.setItem('anytoken_viewer_podium_limit', String(clamped));
    } catch { }
  };

  const handleTogglePodiumVisible = () => {
    const next = !isPodiumVisible;
    setIsPodiumVisible(next);
    try {
      localStorage.setItem('anytoken_viewer_podium_visible', String(next));
    } catch { }
  };

  const handleScrollToViewer = (userId: string) => {
    if (searchFilter) setSearchFilter('');

    setExpandedUserIds(prev => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

    setTimeout(() => {
      const el = document.getElementById(`viewer-card-${userId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setSpotlightedUserId(userId);
        setTimeout(() => {
          setSpotlightedUserId(curr => curr === userId ? null : curr);
        }, 2200);
      }
    }, 60);
  };

  const displayPodiumList = useMemo(() => {
    const list = (podiumMode === 'race' && recentWinners.length > 0)
      ? recentWinners
      : leaderboardUsers;
    return list.slice(0, podiumLimit);
  }, [podiumMode, recentWinners, leaderboardUsers, podiumLimit]);

  // Compact / Expandable state
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  // Quick Points Management state
  const [isPointsToolsOpen, setIsPointsToolsOpen] = useState(false);
  const [pointsInputValue, setPointsInputValue] = useState('1000');

  // Auto-scroll state
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anytoken_viewers_auto_scroll') === 'true';
    } catch {
      return false;
    }
  });

  const { containerRef: rosterScrollRef } = useAutoScroll<HTMLDivElement>({
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
      localStorage.setItem('anytoken_viewers_auto_scroll', String(next));
    } catch { }
  };

  const toggleUserExpanded = useCallback((userId: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedUserIds(new Set());
      setIsAllExpanded(false);
    } else {
      setExpandedUserIds(new Set(baseUsers.map(u => u.id)));
      setIsAllExpanded(true);
    }
  };

  const getSelectedOutcome = useCallback((userId: string) => {
    return selectedUserOutcomes[userId] || (outcomes.length > 0 ? outcomes[0].id : '1');
  }, [selectedUserOutcomes, outcomes]);

  const getBetInput = useCallback((userId: string) => {
    return userBetInputs[userId] ?? '100';
  }, [userBetInputs]);

  const handleOutcomeChange = useCallback((userId: string, val: string) => {
    setSelectedUserOutcomes(prev => ({ ...prev, [userId]: val }));
  }, []);

  const handleInputChange = useCallback((userId: string, val: string) => {
    setUserBetInputs(prev => ({ ...prev, [userId]: val }));
  }, []);

  const handleBetClick = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const amount = parseInt(getBetInput(userId), 10) || 0;
    const outcomeId = getSelectedOutcome(userId);
    const targetOutcome = outcomes.find(o => o.id === outcomeId);
    if (targetOutcome?.isLocked) return;
    if (amount > 0) {
      onBet(userId, amount, outcomeId);
    }
  }, [getBetInput, getSelectedOutcome, outcomes, onBet]);

  const handleQuickPresetBet = useCallback((userId: string, amount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserBetInputs(prev => ({ ...prev, [userId]: String(amount) }));
  }, []);

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    onAddUser(newUserName.trim());
    setNewUserName('');
    setIsAddingUser(false);
  };

  const handleSetAllPointsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseInt(pointsInputValue, 10);
    if (!isNaN(amt) && onSetAllPoints) {
      onSetAllPoints(amt);
    }
  };

  const handleAddPointsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseInt(pointsInputValue, 10);
    if (!isNaN(amt) && amt > 0 && onAddPointsToAll) {
      onAddPointsToAll(amt);
    }
  };

  const totalRosterCount = baseUsers.length;

  const filteredUsers = useMemo(() => {
    if (!searchFilter.trim()) return baseUsers;
    const q = searchFilter.toLowerCase();
    return baseUsers.filter(u => u.name.toLowerCase().includes(q));
  }, [baseUsers, searchFilter]);

  // Dynamic sorting (Winnings / Tokens vs Default)
  const sortedUsers = useMemo(() => {
    return sortMode === 'winnings'
      ? [...filteredUsers].sort((a, b) => b.tokens - a.tokens)
      : filteredUsers;
  }, [sortMode, filteredUsers]);

  // Cap rendered DOM cards to 50 for instantaneous responsiveness with 1,000+ users
  // Ensure strictly unique user IDs so React reconciliation never swaps DOM nodes or flickers
  const displayedUsers = useMemo(() => {
    const sliced = sortedUsers.slice(0, 50);
    const seen = new Set<string>();
    return sliced.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [sortedUsers]);

  return (
    <div className="user-roster-panel cosmos-panel">
      {/* Standalone Editable Title & Icon Header */}
      <div className="roster-header-top">
        <button
          type="button"
          className="cyber-nav-btn btn-icon-only panel-icon-btn"
          onClick={onOpenIconEditor}
          title="Click to customize Viewers icon & 3D token"
        >
          <span className="panel-icon-emoji">
            <IconDisplay icon={emoji} fallback="👥" />
          </span>
        </button>

        <input
          type="text"
          className="panel-editable-title-input"
          value={title}
          onChange={(e) => onUpdateTitle?.(e.target.value)}
          placeholder="Viewers..."
          title="Click to rename Viewers section"
        />

        <span className="panel-count-pill">
          ({searchFilter.trim() ? `${filteredUsers.length}/${totalRosterCount}` : totalRosterCount})
        </span>
      </div>

      {/* Separator Divider */}
      <div className="panel-header-divider" />

      {/* Action Strip: Buttons moved underneath so the title stands alone */}
      <div className="roster-action-strip">
        {/* Live / Debug Mode Toggle (Admin Only) */}
        {isAdmin && onToggleDebugMode && (
          <button
            type="button"
            className={`cyber-btn-ghost mini-btn ${isDebugMode ? 'debug-toggle-on' : ''}`}
            onClick={() => onToggleDebugMode(!isDebugMode)}
            title="Toggle between Live Clean Mode (only real chat viewers) and Debug Mode (mock test viewers + chat simulation)"
          >
            <Terminal size={11} color={isDebugMode ? 'currentColor' : 'var(--accent-green, #10b981)'} />
            <span>{isDebugMode ? 'Debug' : 'Live'}</span>
          </button>
        )}

        {/* Winnings Sort Toggle */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${sortMode === 'winnings' ? 'active-amber' : ''}`}
          onClick={() => setSortMode(s => s === 'default' ? 'winnings' : 'default')}
          title={sortMode === 'winnings' ? "Sorted by Winnings. Click for Default order" : "Click to sort by Winnings / Tokens"}
        >
          <Trophy size={11} color={sortMode === 'winnings' ? 'currentColor' : '#94a3b8'} />
          <span>{sortMode === 'winnings' ? 'Wins' : 'Sort'}</span>
        </button>

        {/* Winners Podium Toggle Button */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${isPodiumVisible ? 'active-amber' : ''} ${recentWinners.length > 0 ? 'podium-pulse-btn' : ''}`}
          onClick={handleTogglePodiumVisible}
          title={recentWinners.length > 0 ? `Toggle Winners Podium (${recentWinners.length} winning viewers)` : "Toggle Viewer Winners Podium"}
        >
          <Trophy size={11} color={isPodiumVisible || recentWinners.length > 0 ? '#f59e0b' : '#94a3b8'} />
          <span>Podium{recentWinners.length > 0 ? ` (${recentWinners.length})` : ''}</span>
        </button>

        {/* Points Tools Toggle (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            className={`cyber-btn-ghost mini-btn ${isPointsToolsOpen ? 'active-amber' : ''}`}
            onClick={() => setIsPointsToolsOpen(!isPointsToolsOpen)}
            title="Quick Points Management Tools"
          >
            <Coins size={11} color={isPointsToolsOpen ? 'currentColor' : 'var(--accent-gold, #fbbf24)'} />
            <span>Pts</span>
          </button>
        )}

        {/* Add Viewer Button (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            className="cyber-btn-secondary mini-btn"
            onClick={() => setIsAddingUser(!isAddingUser)}
            title="Add Viewer to Stream Roster"
          >
            <Plus size={11} />
            <span>Add</span>
          </button>
        )}

        {/* Auto Scroll Toggle */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${isAutoScroll ? 'active-amber' : ''}`}
          onClick={handleToggleAutoScroll}
          title={isAutoScroll ? "Pause viewer auto-scrolling" : "Enable continuous auto-scrolling across viewers"}
        >
          <Repeat size={11} className={isAutoScroll ? 'spin-slow' : ''} />
          <span>Auto</span>
        </button>

        {/* Expand / Collapse All */}
        <button
          type="button"
          className="cyber-btn-ghost mini-btn icon-only"
          onClick={handleToggleExpandAll}
          title={isAllExpanded ? "Collapse all viewers" : "Expand all viewers"}
        >
          <ChevronsUpDown size={12} />
        </button>
      </div>

      {/* Quick Points Tools Dropdown Bar (Admin Only) */}
      {isAdmin && isPointsToolsOpen && (
        <div className="roster-points-tools-bar">
          <div className="points-tools-header">
            <span className="points-tools-title">
              <Coins size={12} color="#f59e0b" /> Points Tools
            </span>
            <button
              type="button"
              className="points-tools-close"
              onClick={() => setIsPointsToolsOpen(false)}
              title="Close points tools"
            >
              <X size={12} />
            </button>
          </div>

          <form onSubmit={handleAddPointsSubmit} className="points-input-row">
            <input
              type="number"
              min="0"
              value={pointsInputValue}
              onChange={e => setPointsInputValue(e.target.value)}
              className="points-tools-input"
              placeholder="Amount..."
              autoFocus
            />
            <button
              type="submit"
              className="points-action-btn add-btn"
              title="Add this amount of points to all viewers"
            >
              <Plus size={11} /> Add All
            </button>
            <button
              type="button"
              onClick={handleSetAllPointsSubmit}
              className="points-action-btn set-btn"
              title="Set all viewers' balances to this exact amount"
            >
              Set All
            </button>
          </form>

          <div className="points-quick-actions">
            <span className="points-tools-label">Quick:</span>
            <button
              type="button"
              className="points-preset-chip"
              onClick={() => onAddPointsToAll && onAddPointsToAll(500)}
              title="Add 500 points to every viewer"
            >
              +500
            </button>
            <button
              type="button"
              className="points-preset-chip"
              onClick={() => onAddPointsToAll && onAddPointsToAll(1000)}
              title="Add 1,000 points to every viewer"
            >
              +1k
            </button>
            <button
              type="button"
              className="points-preset-chip"
              onClick={() => onAddPointsToAll && onAddPointsToAll(5000)}
              title="Add 5,000 points to every viewer"
            >
              +5k
            </button>
            <button
              type="button"
              className="points-preset-chip chip-danger"
              onClick={() => onClearAllPoints && onClearAllPoints()}
              title="Reset all viewers' balances to 0"
            >
              <RotateCcw size={10} /> Reset (0)
            </button>
          </div>
        </div>
      )}

      {/* Simulator Ribbon (Visible ONLY in Debug Mode when Admin is unlocked) */}
      {isAdmin && isDebugMode && (
        <div className="sim-quick-bar">
          <span className="sim-label"><Bot size={11} /> Sim:</span>
          <button
            type="button"
            className="sim-action-btn"
            onClick={() => onSimulateRandomBets(1)}
            title="Simulate 1 chat bet"
          >
            +1 Bet
          </button>
          <button
            type="button"
            className="sim-action-btn"
            onClick={() => onSimulateRandomBets(5)}
            title="Simulate 5 random chat bets"
          >
            +5 Wave
          </button>
          <button
            type="button"
            className="sim-action-btn-highlight"
            onClick={() => onSimulateRandomBets(15)}
            title="Simulate 15 rapid chat bets (Horse Race Rush!)"
          >
            <Zap size={11} /> 15 Rush
          </button>
          <button
            type="button"
            className="sim-action-btn-highlight sim-action-avalanche"
            onClick={() => onSimulateRandomBets(30)}
            title="Simulate 30 rapid avalanche bets (500+ coins mountain cascade!)"
          >
            <Flame size={11} /> 30 Avalanche
          </button>
          {onToggleSwarm && (
            <button
              type="button"
              className={`sim-action-btn-highlight sim-action-swarm ${isSwarmActive ? 'swarm-active' : ''}`}
              onClick={onToggleSwarm}
              title="Extreme Stress Test: 1,000 simulated viewers placing bets at ~4 per second"
            >
              <Radio size={11} className={isSwarmActive ? 'swarm-pulse' : ''} />
              <span>{isSwarmActive ? `Swarm (${swarmCount})` : '⚡ 1k Swarm (4/s)'}</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Add Viewer Inline Drawer (Admin Only) */}
      {isAdmin && isAddingUser && (
        <form onSubmit={handleAddNewUser} className="add-user-drawer">
          <input
            type="text"
            placeholder="Viewer Username..."
            value={newUserName}
            onChange={e => setNewUserName(e.target.value)}
            className="cyber-input"
            style={{ flex: 1 }}
            autoFocus
          />
          <button type="submit" className="cyber-btn-primary mini-btn">
            Add
          </button>
        </form>
      )}

      {/* Viewer Winners Podium Dock */}
      {isPodiumVisible && (
        <div className="viewer-winners-podium-dock">
          <div className="viewer-podium-header">
            <div className="viewer-podium-title">
              <Trophy size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {podiumMode === 'race' && recentWinners.length > 0
                  ? `Podium (${Math.min(podiumLimit, recentWinners.length)}/${recentWinners.length})`
                  : `Top ${Math.min(podiumLimit, leaderboardUsers.length)} Leaders`}
              </span>
            </div>

            <div className="viewer-podium-controls">
              {/* Stepper to change top X winners */}
              <div className="viewer-podium-stepper" title="Number of winning players to display on the podium">
                <span className="viewer-podium-stepper-label">Top:</span>
                <button
                  type="button"
                  className="places-stepper-btn"
                  onClick={() => handleSetPodiumLimit(podiumLimit - 1)}
                  title="Show fewer podium winners"
                >
                  <Minus size={9} strokeWidth={2.5} />
                </button>
                <span className="viewer-podium-stepper-val">{podiumLimit}</span>
                <button
                  type="button"
                  className="places-stepper-btn"
                  onClick={() => handleSetPodiumLimit(podiumLimit + 1)}
                  title="Show more podium winners"
                >
                  <Plus size={9} strokeWidth={2.5} />
                </button>
              </div>

              {/* Mode switch (if both recent race winners and roster viewers exist) */}
              {recentWinners.length > 0 && (
                <div className="viewer-podium-tabs">
                  <button
                    type="button"
                    className={`viewer-podium-tab-btn ${podiumMode === 'race' ? 'is-active' : ''}`}
                    onClick={() => setPodiumMode('race')}
                    title="Show race winners"
                  >
                    Race
                  </button>
                  <button
                    type="button"
                    className={`viewer-podium-tab-btn ${podiumMode === 'leaderboard' ? 'is-active' : ''}`}
                    onClick={() => setPodiumMode('leaderboard')}
                    title="Show token leaders"
                  >
                    Leaders
                  </button>
                </div>
              )}

              {/* Dismiss / Close button */}
              <button
                type="button"
                className="viewer-podium-close-btn"
                onClick={handleTogglePodiumVisible}
                title="Hide winners podium"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Cards Strip */}
          <div className="viewer-podium-cards-strip">
            {displayPodiumList.length === 0 ? (
              <div className="viewer-podium-empty">
                No winners to display. Run a race to crown winners!
              </div>
            ) : (
              displayPodiumList.map((viewer, idx) => {
                const rank = idx + 1;
                const pColor = getPodiumColor(rank, Math.max(displayPodiumList.length, 3));
                const isRaceWin = viewer.lastResult?.type === 'win';
                const isRainbowPodium = isRaceWin && viewer.lastResult?.timestamp && (Date.now() - viewer.lastResult.timestamp < 12000);

                return (
                  <div
                    key={`${viewer.id}_podium_${rank}`}
                    className={`viewer-podium-card ${isRainbowPodium ? 'rainbow-card-shine' : ''}`}
                    style={{
                      borderColor: pColor.hex,
                      boxShadow: `0 2px 8px ${pColor.hex}35, inset 0 1px 0 rgba(255, 255, 255, 0.7)`,
                      background: `linear-gradient(135deg, ${pColor.hex}14 0%, var(--card-bg-elevated, #ffffff) 100%)`,
                    }}
                    onClick={() => handleScrollToViewer(viewer.id)}
                    title={`Click to focus ${viewer.name} in viewer roster`}
                  >
                    <div className="metallic-sheen" />

                    {/* Rank Badge */}
                    <div
                      className="viewer-podium-rank"
                      style={{
                        background: `linear-gradient(135deg, ${pColor.lightHex} 0%, ${pColor.hex} 50%, ${pColor.darkHex} 100%)`,
                        color: pColor.textContrast,
                        borderColor: pColor.darkHex,
                      }}
                    >
                      #{rank}
                    </div>

                    {/* Viewer Avatar */}
                    <div className="viewer-podium-avatar-box">
                      <IconDisplay icon={viewer.config.emoji} className="viewer-podium-avatar" />
                    </div>

                    {/* Viewer Details */}
                    <div className="viewer-podium-details">
                      <span className="viewer-podium-name" title={viewer.name}>
                        {viewer.name}
                      </span>
                      <span className="viewer-podium-sub">
                        {podiumMode === 'race' && isRaceWin && viewer.lastResult?.outcomeName
                          ? viewer.lastResult.outcomeName
                          : `${formatCompactPts(viewer.tokens)} tokens`}
                      </span>
                    </div>

                    {/* Payout or Balance Pill */}
                    <div
                      className="viewer-podium-stat-pill"
                      style={{
                        background: `linear-gradient(180deg, ${pColor.lightHex}20 0%, ${pColor.hex}30 100%)`,
                        color: pColor.darkHex,
                        borderColor: `${pColor.hex}66`,
                      }}
                    >
                      {podiumMode === 'race' && isRaceWin ? (
                        <>
                          <ArrowUpRight size={10} />
                          <span>+<AnimatedTokenCounter value={viewer.lastResult!.amount} isWin={true} formatCompact={true} /></span>
                        </>
                      ) : (
                        <span><AnimatedTokenCounter value={viewer.tokens} isWin={isRaceWin} formatCompact={true} /></span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Search & Filter Bar (Themed to match Entrants Filter Box) */}
      {(totalRosterCount > 0 || searchFilter.length > 0) && (
        <div className="viewer-filter-wrapper">
          <Search size={13} className="viewer-search-icon" />
          <input
            type="text"
            className="viewer-search-input"
            placeholder={`Filter ${totalRosterCount} ${(title || 'viewers').toLowerCase()}...`}
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
          {searchFilter && (
            <button
              type="button"
              className="viewer-filter-clear-btn"
              onClick={() => setSearchFilter('')}
              title="Clear search filter"
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* Users List with Viewer Cards */}
      <div ref={rosterScrollRef} className="roster-list-scroll">
        {sortedUsers.length > 50 && (
          <div
            style={{
              fontSize: '10px',
              fontFamily: '"JetBrains Mono", monospace',
              color: 'var(--text-title, #7D6B42)',
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.45))',
              padding: '3px 8px',
              borderRadius: '4px',
              textAlign: 'center',
              marginBottom: '4px',
              fontWeight: 600,
            }}
          >
            Showing top 50 of {sortedUsers.length.toLocaleString()} active viewers
          </div>
        )}
        {displayedUsers.length === 0 ? (
          searchFilter ? (
            <div className="empty-roster-notice">
              <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.35rem' }}>🔍</span>
              <span>No {(title || 'viewers').toLowerCase()} match &ldquo;{searchFilter}&rdquo;</span>
              <button
                type="button"
                className="cyber-btn-ghost mini-btn"
                style={{ marginTop: '0.5rem', alignSelf: 'center' }}
                onClick={() => setSearchFilter('')}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="empty-roster-notice">
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>👥</span>
              <span>No {(title || 'viewers').toLowerCase()} joined yet.</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)', display: 'block', marginTop: '0.2rem' }}>
                Viewers appear automatically when they bet in stream chat.
              </span>
            </div>
          )
        ) : (
          displayedUsers.map(user => (
            <ViewerCard
              key={user.id}
              user={user}
              isExpanded={expandedUserIds.has(user.id)}
              isSpotlighted={spotlightedUserId === user.id}
              selectedOutcomeId={getSelectedOutcome(user.id)}
              currentInput={getBetInput(user.id)}
              outcomes={outcomes}
              onToggleExpand={toggleUserExpanded}
              onOpenTokenMaker={onOpenTokenMaker}
              onRemoveUser={onRemoveUser}
              onUpdateUserPoints={onUpdateUserPoints}
              onOutcomeChange={handleOutcomeChange}
              onInputChange={handleInputChange}
              onQuickPresetBet={handleQuickPresetBet}
              onBetClick={handleBetClick}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
    </div>
  );
};

// --- MEMOIZED VIEWER CARD ---
// Skips rendering when other viewers update, eliminating 90%+ of React virtual DOM reconciliation
interface ViewerCardProps {
  user: UserRosterItem;
  isExpanded: boolean;
  isSpotlighted?: boolean;
  selectedOutcomeId: string;
  currentInput: string;
  outcomes: BetOutcome[];
  onToggleExpand: (userId: string) => void;
  onOpenTokenMaker: (user: UserRosterItem) => void;
  onRemoveUser?: (userId: string) => void;
  onUpdateUserPoints?: (userId: string, points: number) => void;
  onOutcomeChange: (userId: string, val: string) => void;
  onInputChange: (userId: string, val: string) => void;
  onQuickPresetBet: (userId: string, amount: number, e: React.MouseEvent) => void;
  onBetClick: (userId: string, e: React.MouseEvent) => void;
  isAdmin?: boolean;
}

const ViewerCard = React.memo<ViewerCardProps>(({
  user,
  isExpanded,
  isSpotlighted,
  selectedOutcomeId,
  currentInput,
  outcomes,
  onToggleExpand,
  onOpenTokenMaker,
  onRemoveUser,
  onUpdateUserPoints,
  onOutcomeChange,
  onInputChange,
  onQuickPresetBet,
  onBetClick,
  isAdmin = true,
}) => {
  const tierColor = getTierColor(user.tokens);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [editPointsVal, setEditPointsVal] = useState(String(user.tokens));

  const handlePointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(editPointsVal, 10);
    if (!isNaN(parsed) && onUpdateUserPoints) {
      onUpdateUserPoints(user.id, Math.max(0, parsed));
    }
    setIsEditingPoints(false);
  };

  const isRecentWin = user.lastResult?.type === 'win';
  const winPlace = isRecentWin ? (user.lastResult?.place || 1) : null;
  const podiumColor = winPlace ? getPodiumColor(winPlace, Math.max(3, winPlace)) : null;

  const [isCapsuleLerping, setIsCapsuleLerping] = useState(false);
  const [hasCapsuleShine, setHasCapsuleShine] = useState(false);

  // Rainbow card shine active for 12 seconds after win
  const [isRainbowActive, setIsRainbowActive] = useState<boolean>(() => {
    if (!isRecentWin || !user.lastResult?.timestamp) return false;
    return (Date.now() - user.lastResult.timestamp) < 12000;
  });

  useEffect(() => {
    if (isRecentWin && user.lastResult?.timestamp) {
      const elapsed = Date.now() - user.lastResult.timestamp;
      if (elapsed < 12000) {
        setIsRainbowActive(true);
        const timer = setTimeout(() => {
          setIsRainbowActive(false);
        }, 12000 - elapsed);
        return () => clearTimeout(timer);
      } else {
        setIsRainbowActive(false);
      }
    } else {
      setIsRainbowActive(false);
    }
  }, [isRecentWin, user.lastResult?.timestamp]);

  return (
    <div
      id={`viewer-card-${user.id}`}
      className={`viewer-card ${isExpanded ? 'is-expanded' : ''} ${winPlace ? 'podium-player-win' : ''} ${isSpotlighted ? 'is-spotlighted' : ''} ${isRainbowActive ? 'rainbow-card-shine' : ''}`}
      style={{
        '--viewer-accent-color': tierColor,
        '--winner-podium-color': podiumColor?.hex,
        '--winner-podium-light': podiumColor?.lightHex,
        '--winner-podium-dark': podiumColor?.darkHex,
        borderColor: podiumColor?.hex,
        boxShadow: podiumColor ? `0 0 14px ${podiumColor.hex}66, 0 2px 6px rgba(0, 0, 0, 0.18)` : undefined,
      } as React.CSSProperties}
    >
      {/* 1. Top Row: Avatar Accent + User Details + Quick Actions */}
      <div
        className="viewer-card-top-row"
        onClick={() => onToggleExpand(user.id)}
        title="Click to toggle betting controls"
      >
        {/* Left Accent Group: Chunky Tactile Token Badge (Clean uncluttered token view) */}
        <div
          className="viewer-accent-group"
          style={podiumColor ? {
            borderColor: podiumColor.hex,
            boxShadow: `inset 0 0 6px ${podiumColor.lightHex}99, 0 0 10px ${podiumColor.hex}66`,
          } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onOpenTokenMaker(user);
          }}
          title={
            winPlace
              ? `#${winPlace} Place Winner! Click to customize 3D/2D Token`
              : "Click to customize this viewer's 3D/2D Token"
          }
        >
          <IconDisplay icon={user.config.emoji} className="viewer-token-emoji" />
          {winPlace === 1 && <span className="viewer-podium-crown">👑</span>}
          {winPlace && winPlace > 1 && winPlace <= 3 && (
            <span
              className="viewer-podium-badge"
              style={{
                background: `linear-gradient(135deg, ${podiumColor?.lightHex} 0%, ${podiumColor?.hex} 50%, ${podiumColor?.darkHex} 100%)`,
                color: podiumColor?.textContrast,
                borderColor: podiumColor?.darkHex,
              }}
            >
              #{winPlace}
            </span>
          )}
        </div>

        {/* Center Content: Inset Name Container & Metric Capsules */}
        <div className="viewer-center-area">
          {/* Inset Name Container */}
          <div className="viewer-name-container">
            <span className="viewer-username" title={user.name}>
              {user.name}
            </span>

            {/* Result Pill if recent win/lose */}
            {user.lastResult && (
              <div
                className={`viewer-result-capsule result-${user.lastResult.type} ${podiumColor ? 'capsule-podium-win' : ''
                  }`}
                style={podiumColor ? {
                  background: `linear-gradient(135deg, ${podiumColor.lightHex} 0%, ${podiumColor.hex} 50%, ${podiumColor.darkHex} 100%)`,
                  borderColor: podiumColor.hex,
                  color: podiumColor.textContrast,
                } : undefined}
                title={
                  winPlace
                    ? `#${winPlace} Place Winner on ${user.lastResult.outcomeName}`
                    : undefined
                }
              >
                {user.lastResult.type === 'win' ? (
                  <>
                    <span className="result-medal-tag">
                      #{winPlace}
                    </span>
                    <ArrowUpRight size={10} />
                    +{user.lastResult.amount.toLocaleString()}
                  </>
                ) : (
                  <>
                    <ArrowDownRight size={10} />
                    -{user.lastResult.amount.toLocaleString()}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Metric Capsules Row */}
          <div className="viewer-metrics-row">
            {isEditingPoints ? (
              <form
                onSubmit={handlePointsSubmit}
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <input
                  type="number"
                  min="0"
                  value={editPointsVal}
                  onChange={e => setEditPointsVal(e.target.value)}
                  autoFocus
                  onBlur={handlePointsSubmit}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setIsEditingPoints(false);
                  }}
                  style={{
                    width: '65px',
                    height: '20px',
                    fontSize: '0.72rem',
                    fontFamily: "'Merge One', system-ui, sans-serif",
                    fontWeight: 700,
                    padding: '0 4px',
                    borderRadius: '4px',
                    border: '1px solid var(--accent-gold, #fbbf24)',
                    background: 'var(--card-bg-elevated, #FFF)',
                    color: 'var(--text-primary, #5A4A28)',
                  }}
                />
                <button
                  type="submit"
                  className="cyber-btn-primary mini-btn"
                  style={{ height: '20px', padding: '0 4px', fontSize: '0.65rem' }}
                >
                  ✓
                </button>
              </form>
            ) : (
              <div
                className={`viewer-pts-capsule ${isCapsuleLerping ? 'capsule-is-lerping' : ''} ${hasCapsuleShine ? 'capsule-just-shined' : ''}`}
                title={isAdmin ? `${user.tokens.toLocaleString()} points balance. Click to edit points` : `${user.tokens.toLocaleString()} points balance`}
                onClick={(e) => {
                  if (!isAdmin) return;
                  e.stopPropagation();
                  setEditPointsVal(String(user.tokens));
                  setIsEditingPoints(true);
                }}
                style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              >
                <Coins size={10} color="#8E7D53" />
                <span className="capsule-val">
                  <AnimatedTokenCounter
                    value={user.tokens}
                    isWin={isRecentWin}
                    onLerpStateChange={(lerping, shine) => {
                      setIsCapsuleLerping(lerping);
                      setHasCapsuleShine(shine);
                    }}
                  />
                </span>
                <span className="capsule-unit">pts</span>
              </div>
            )}

            {/* Chunky Tier Badge */}
            <div
              className="viewer-tier-capsule"
              style={{ backgroundColor: tierColor }}
              title={`Rank Tier: ${getTierName(user.tokens)}`}
            >
              {getTierName(user.tokens)}
            </div>
          </div>
        </div>

        {/* Right Actions Column */}
        <div className="viewer-actions-col">
          {isAdmin && onRemoveUser && (
            <button
              type="button"
              className="viewer-icon-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveUser(user.id);
              }}
              title="Remove viewer"
            >
              <Trash2 size={11} />
            </button>
          )}

          <button
            type="button"
            className="viewer-icon-btn expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(user.id);
            }}
            title={isExpanded ? "Collapse betting options" : "Expand betting options"}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Expandable Betting Drawer */}
      {isExpanded && (
        <div className="viewer-betting-drawer" onClick={e => e.stopPropagation()}>
          {/* Line 1: Outcome Selection */}
          <div className="drawer-outcome-row">
            <label className="drawer-label">Bet On:</label>
            <select
              value={selectedOutcomeId}
              onChange={e => onOutcomeChange(user.id, e.target.value)}
              className="drawer-outcome-select"
            >
              {outcomes.map(o => (
                <option key={o.id} value={o.id} disabled={o.isLocked}>
                  #{o.number} {o.name} ({o.odds.toFixed(2)}x){o.isLocked ? ' 🔒' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Line 2: Bet Amount Input + Quick Chips + Drop Button */}
          <div className="drawer-action-row">
            <div className="drawer-input-wrap">
              <input
                type="number"
                min="1"
                max={user.tokens}
                value={currentInput}
                onChange={e => onInputChange(user.id, e.target.value)}
                className="drawer-amount-input"
                placeholder="Amount"
              />
            </div>

            <div className="drawer-chips-wrap">
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={(e) => onQuickPresetBet(user.id, 100, e)}
              >
                100
              </button>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={(e) => onQuickPresetBet(user.id, 500, e)}
              >
                500
              </button>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={(e) => onQuickPresetBet(user.id, Math.floor(user.tokens / 2), e)}
                title="Half stack"
              >
                ½
              </button>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={(e) => onQuickPresetBet(user.id, user.tokens, e)}
                title="All in"
              >
                Max
              </button>
            </div>

            <button
              type="button"
              className="drawer-drop-button"
              onClick={(e) => onBetClick(user.id, e)}
              disabled={user.tokens <= 0}
              title="Drop tokens into 3D/2D arena"
            >
              <Sparkles size={11} />
              <span>Drop</span>
            </button>
          </div>

          {/* Quick Individual Points Adjustment Row */}
          {onUpdateUserPoints && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.45rem',
                paddingTop: '0.35rem',
                borderTop: '1px dashed var(--well-border, rgba(125, 107, 66, 0.22))'
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #8E7D53)' }}>
                Tokens:
              </span>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={() => onUpdateUserPoints(user.id, user.tokens + 1000)}
                title="Add 1,000 points to this viewer"
              >
                +1k
              </button>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={() => onUpdateUserPoints(user.id, user.tokens + 5000)}
                title="Add 5,000 points to this viewer"
              >
                +5k
              </button>
              <button
                type="button"
                className="drawer-preset-chip"
                onClick={() => onUpdateUserPoints(user.id, 50000)}
                title="Reset points to default 50k"
              >
                Set 50k
              </button>
              <button
                type="button"
                className="drawer-preset-chip chip-danger"
                onClick={() => onUpdateUserPoints(user.id, 0)}
                title="Clear points to 0"
                style={{ marginLeft: 'auto' }}
              >
                Clear (0)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
