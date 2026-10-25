import React, { useState, useMemo } from 'react';
import { FileText, X, Search, Copy, Check, Download, Clock, Trophy } from 'lucide-react';
import type { Contest, UserRosterItem } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { IconDisplay } from './IconDisplay';

export interface BetLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  users?: UserRosterItem[];
  isDebugMode?: boolean;
}

export const BetLogModal: React.FC<BetLogModalProps> = ({
  isOpen,
  onClose,
  contest,
  users = [],
  isDebugMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lookup map for outcomes
  const outcomeMap = useMemo(() => {
    const map = new Map<string, { name: string; number: number; color: string; icon: string }>();
    for (const o of contest.outcomes) {
      map.set(o.id, { name: o.name, number: o.number, color: o.color, icon: o.icon });
    }
    return map;
  }, [contest.outcomes]);

  // Lookup map for users
  const userMap = useMemo(() => {
    const map = new Map<string, UserRosterItem>();
    for (const u of users) {
      map.set(u.id, u);
    }
    return map;
  }, [users]);

  // All bets from contest, sorted latest first
  const allBets = useMemo(() => {
    return [...contest.bets].reverse();
  }, [contest.bets]);

  // Compute winning outcome IDs
  const winningOutcomeIds = useMemo(() => {
    if (contest.status !== 'resolved') return new Set<string>();
    const set = new Set<string>();
    if (contest.winningOutcomeId) set.add(contest.winningOutcomeId);
    if (contest.podiumOutcomeIds) {
      contest.podiumOutcomeIds.forEach(id => set.add(id));
    }
    return set;
  }, [contest.status, contest.winningOutcomeId, contest.podiumOutcomeIds]);

  // Summary KPIs
  const totalVolume = useMemo(() => {
    return contest.bets.reduce((sum, b) => sum + b.amount, 0);
  }, [contest.bets]);

  const uniqueBettorCount = useMemo(() => {
    const ids = new Set<string>();
    contest.bets.forEach(b => {
      if (b.userId !== 'house_pot') ids.add(b.userId);
    });
    return ids.size;
  }, [contest.bets]);

  // Outcome bet counts
  const outcomeBetCounts = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    for (const b of contest.bets) {
      if (!counts[b.outcomeId]) counts[b.outcomeId] = { count: 0, total: 0 };
      counts[b.outcomeId].count += 1;
      counts[b.outcomeId].total += b.amount;
    }
    return counts;
  }, [contest.bets]);

  // Filtered bets
  const filteredBets = useMemo(() => {
    return allBets.filter(bet => {
      // Entrant filter
      if (selectedOutcomeId !== 'all' && bet.outcomeId !== selectedOutcomeId) {
        return false;
      }

      // Win / Loss status filter (if resolved)
      if (contest.status === 'resolved' && statusFilter !== 'all') {
        const isWin = winningOutcomeIds.has(bet.outcomeId);
        if (statusFilter === 'wins' && !isWin) return false;
        if (statusFilter === 'losses' && isWin) return false;
      }

      // In live mode (!isDebugMode), filter out mock users from log
      if (!isDebugMode) {
        const u = userMap.get(bet.userId);
        if (u?.isMockUser) return false;
      }

      // Search query filter (matches bettor name, entrant name, or horse number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesUser = bet.userName.toLowerCase().includes(q);
        const matchesOutcome = bet.outcomeName.toLowerCase().includes(q);
        const horse = outcomeMap.get(bet.outcomeId);
        const matchesNum = horse ? String(horse.number) === q || `#${horse.number}` === q : false;
        if (!matchesUser && !matchesOutcome && !matchesNum) return false;
      }

      return true;
    });
  }, [allBets, selectedOutcomeId, statusFilter, searchQuery, contest.status, winningOutcomeIds, outcomeMap, isDebugMode, userMap]);

  // Copy to Clipboard action
  const handleCopyLog = () => {
    if (filteredBets.length === 0) return;

    const lines: string[] = [];
    lines.push(`Contest Bet Log: "${contest.title}" (${new Date().toLocaleString()})`);
    lines.push(`Status: ${contest.status.toUpperCase()} | Total Pool: ${contest.totalPool.toLocaleString()} pts | Bets: ${contest.bets.length}`);
    lines.push('-'.repeat(60));

    filteredBets.forEach(b => {
      const timeStr = new Date(b.timestamp).toLocaleTimeString();
      const horse = outcomeMap.get(b.outcomeId);
      const horseStr = horse ? `#${horse.number} ${horse.name}` : b.outcomeName;
      let statusStr = 'Pending';
      if (contest.status === 'resolved') {
        statusStr = winningOutcomeIds.has(b.outcomeId) ? 'WINNER' : 'LOST';
      }
      lines.push(`[${timeStr}] ${b.userName.padEnd(16)} -> ${horseStr.padEnd(20)} | ${b.amount.toLocaleString()} pts | ${statusStr}`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    soundEffects.playTokenClink();
    setTimeout(() => setCopied(false), 2200);
  };

  // Export CSV action
  const handleExportCSV = () => {
    if (filteredBets.length === 0) return;

    const headers = ['Timestamp', 'Time', 'User ID', 'Bettor Name', 'Entrant Number', 'Entrant Name', 'Amount (pts)', 'Status', 'Contest Title'];
    const rows = filteredBets.map(b => {
      const d = new Date(b.timestamp);
      const iso = d.toISOString();
      const timeStr = d.toLocaleTimeString();
      const horse = outcomeMap.get(b.outcomeId);
      let statusStr = 'Pending';
      if (contest.status === 'resolved') {
        statusStr = winningOutcomeIds.has(b.outcomeId) ? 'Win' : 'Loss';
      }
      return [
        `"${iso}"`,
        `"${timeStr}"`,
        `"${b.userId}"`,
        `"${b.userName.replace(/"/g, '""')}"`,
        `"${horse?.number || ''}"`,
        `"${(horse?.name || b.outcomeName).replace(/"/g, '""')}"`,
        b.amount,
        `"${statusStr}"`,
        `"${contest.title.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bet_log_${contest.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEffects.playTokenClink();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 120 }}
    >
      <div
        className="settings-modal cosmos-panel"
        style={{
          maxWidth: '920px',
          width: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--well-border, rgba(125, 107, 66, 0.2))',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.2))',
            background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-gold-grad, linear-gradient(135deg, #fbbf24 0%, #d97706 100%))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
              }}
            >
              <FileText size={18} color="#78350f" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontFamily: "var(--font-family-display, 'Merge One', system-ui, sans-serif)",
                  fontWeight: 700,
                  color: 'var(--text-primary, #5A4A28)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>Contest Betting Log</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-family-mono, monospace)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background:
                      contest.status === 'open'
                        ? '#dcfce7'
                        : contest.status === 'locked'
                        ? '#fef3c7'
                        : '#e0e7ff',
                    color:
                      contest.status === 'open'
                        ? '#166534'
                        : contest.status === 'locked'
                        ? '#92400e'
                        : '#3730a3',
                    border: '1px solid currentColor',
                  }}
                >
                  {contest.status}
                </span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}>
                Audit trail of all viewer bets placed on "{contest.title}"
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close log"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary, #5A4A28)',
              padding: '0.35rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Summary Cards Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--card-bg-elevated, #FDFCF7)',
            borderBottom: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
          }}
        >
          <div
            style={{
              background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
              padding: '0.55rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
            }}
          >
            <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600 }}>Total Bets</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-family-mono, monospace)',
                fontWeight: 700,
                color: 'var(--text-primary, #5A4A28)',
              }}
            >
              {contest.bets.length}
            </div>
          </div>

          <div
            style={{
              background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
              padding: '0.55rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
            }}
          >
            <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600 }}>Total Staked</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-family-mono, monospace)',
                fontWeight: 700,
                color: '#d97706',
              }}
            >
              {totalVolume.toLocaleString()}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>pts</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
              padding: '0.55rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
            }}
          >
            <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600 }}>Unique Bettors</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-family-mono, monospace)',
                fontWeight: 700,
                color: 'var(--text-primary, #5A4A28)',
              }}
            >
              {uniqueBettorCount}
            </div>
          </div>

          <div
            style={{
              background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
              padding: '0.55rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
            }}
          >
            <div style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600 }}>Total Pool</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-family-mono, monospace)',
                fontWeight: 700,
                color: '#10b981',
              }}
            >
              {contest.totalPool.toLocaleString()}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>pts</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            padding: '0.65rem 1.25rem',
            background: 'var(--well-bg, rgba(217, 217, 217, 0.25))',
            borderBottom: '1px solid var(--well-border, rgba(125, 107, 66, 0.15))',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.65rem',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
              }}
            />
            <input
              type="text"
              placeholder="Search bettor or entrant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.6rem 0.35rem 1.8rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--well-border, rgba(125, 107, 66, 0.25))',
                background: 'var(--card-bg-elevated, #ffffff)',
                color: 'var(--text-primary, #5A4A28)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Entrant Filter Pills Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              overflowX: 'auto',
              maxWidth: '100%',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedOutcomeId('all')}
              style={{
                padding: '0.28rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: selectedOutcomeId === 'all' ? 'var(--accent-gold, #d97706)' : 'var(--well-border, rgba(125, 107, 66, 0.25))',
                background: selectedOutcomeId === 'all' ? 'var(--accent-gold-grad, #fbbf24)' : 'var(--card-bg-elevated, #ffffff)',
                color: selectedOutcomeId === 'all' ? '#78350f' : 'var(--text-primary, #5A4A28)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All ({allBets.length})
            </button>

            {contest.outcomes.map(o => {
              const countData = outcomeBetCounts[o.id] || { count: 0, total: 0 };
              const isSelected = selectedOutcomeId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOutcomeId(isSelected ? 'all' : o.id)}
                  style={{
                    padding: '0.28rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: isSelected ? o.color : 'var(--well-border, rgba(125, 107, 66, 0.25))',
                    background: isSelected ? `${o.color}25` : 'var(--card-bg-elevated, #ffffff)',
                    color: isSelected ? o.color : 'var(--text-primary, #5A4A28)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    whiteSpace: 'nowrap',
                  }}
                  title={`${o.name}: ${countData.count} bets, ${countData.total.toLocaleString()} pts`}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: o.color,
                      display: 'inline-block',
                    }}
                  />
                  <span>#{o.number} {o.name}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      opacity: 0.75,
                      fontFamily: 'var(--font-family-mono, monospace)',
                    }}
                  >
                    ({countData.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Filter (if resolved) */}
          {contest.status === 'resolved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: '1px solid var(--well-border, rgba(125, 107, 66, 0.25))',
                  background: statusFilter === 'all' ? 'var(--accent-gold, #d97706)' : 'transparent',
                  color: statusFilter === 'all' ? '#fff' : 'inherit',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('wins')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: '1px solid #10b981',
                  background: statusFilter === 'wins' ? '#10b981' : 'transparent',
                  color: statusFilter === 'wins' ? '#fff' : '#10b981',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Wins Only
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('losses')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: '1px solid #ef4444',
                  background: statusFilter === 'losses' ? '#ef4444' : 'transparent',
                  color: statusFilter === 'losses' ? '#fff' : '#ef4444',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Losses Only
              </button>
            </div>
          )}
        </div>

        {/* Bets Scroll List Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem 1.25rem',
            background: 'var(--card-bg, #F1F0E4)',
            minHeight: '260px',
          }}
        >
          {filteredBets.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                textAlign: 'center',
                opacity: 0.65,
                gap: '0.5rem',
              }}
            >
              <FileText size={36} strokeWidth={1.5} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {allBets.length === 0
                  ? 'No bets recorded yet in this round'
                  : 'No bets match your current filter'}
              </div>
              <div style={{ fontSize: '0.8rem', maxWidth: '360px' }}>
                {allBets.length === 0
                  ? 'Bets placed by viewers in Twitch chat (!bet) or added manually will appear here in real-time.'
                  : 'Try clearing the search query or selecting "All" entrants above.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {filteredBets.map((b, idx) => {
                const horse = outcomeMap.get(b.outcomeId);
                const userObj = userMap.get(b.userId);
                const userEmoji = userObj?.config?.emoji || '👤';
                const timeStr = new Date(b.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                const isResolved = contest.status === 'resolved';
                const isWin = isResolved && winningOutcomeIds.has(b.outcomeId);
                const isOverallPot = b.outcomeId === 'overall_pot';

                return (
                  <div
                    key={b.id || `bet_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      background: 'var(--card-bg-elevated, #ffffff)',
                      border: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Left: Time & Bettor Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '180px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-family-mono, monospace)',
                          opacity: 0.6,
                        }}
                      >
                        {timeStr}
                      </span>

                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: userObj?.config?.colorTint ? `${userObj.config.colorTint}25` : '#f1f5f9',
                          border: `1.5px solid ${userObj?.config?.colorTint || '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          flexShrink: 0,
                        }}
                      >
                        <IconDisplay icon={userEmoji} style={{ width: '16px', height: '16px' }} />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary, #5A4A28)',
                            lineHeight: 1.2,
                          }}
                        >
                          {b.userName}
                        </div>
                        {b.userId.startsWith('twitch_') && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#9333ea',
                              fontWeight: 600,
                            }}
                          >
                            Twitch Viewer
                          </span>
                        )}
                        {b.userId === 'house' && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#d97706',
                              fontWeight: 600,
                            }}
                          >
                            House GM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Entrant Staked */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '160px' }}>
                      {horse ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.22rem 0.55rem',
                            borderRadius: '6px',
                            background: `${horse.color}18`,
                            border: `1.5px solid ${horse.color}66`,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-family-mono, monospace)',
                              color: horse.color,
                            }}
                          >
                            #{horse.number}
                          </span>
                          <IconDisplay icon={horse.icon} style={{ width: '14px', height: '14px' }} />
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--text-primary, #5A4A28)',
                            }}
                          >
                            {horse.name}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: isOverallPot ? '#d97706' : 'inherit',
                          }}
                        >
                          {b.outcomeName}
                        </div>
                      )}
                    </div>

                    {/* Right: Stake Amount & Result Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-family-mono, monospace)',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#d97706',
                        }}
                      >
                        {b.amount.toLocaleString()}{' '}
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>pts</span>
                      </div>

                      {/* Status Tag */}
                      {isResolved ? (
                        isWin ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #86efac',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            <Trophy size={11} />
                            <span>WINNER</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            Lost
                          </div>
                        )
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          <Clock size={11} />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.2))',
            background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            Showing <strong>{filteredBets.length}</strong> of <strong>{contest.bets.length}</strong> bets
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Copy Log Button */}
            <button
              type="button"
              className="cyber-btn-ghost"
              onClick={handleCopyLog}
              disabled={filteredBets.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.38rem 0.75rem',
                fontSize: '0.78rem',
                cursor: filteredBets.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredBets.length === 0 ? 0.5 : 1,
              }}
              title="Copy formatted betting log to clipboard"
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Log!' : 'Copy Log'}</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              className="cyber-btn-ghost"
              onClick={handleExportCSV}
              disabled={filteredBets.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.38rem 0.75rem',
                fontSize: '0.78rem',
                cursor: filteredBets.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredBets.length === 0 ? 0.5 : 1,
              }}
              title="Export bets as a CSV spreadsheet"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="cyber-btn-primary"
              onClick={onClose}
              style={{
                padding: '0.38rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
