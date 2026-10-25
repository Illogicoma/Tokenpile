import React, { useMemo } from 'react';
import { Coins, Flame, Sparkles } from 'lucide-react';
import type { Contest } from '../types/betting';

interface CompactTopOddsBarProps {
  contest: Contest;
  onQuickBetOnOutcome: (outcomeId: string) => void;
}

export const CompactTopOddsBar: React.FC<CompactTopOddsBarProps> = ({
  contest,
  onQuickBetOnOutcome,
}) => {
  const runnerBetsTotal = useMemo(
    () => contest.outcomes.reduce((acc, o) => acc + o.totalBet, 0),
    [contest.outcomes]
  );

  const outcomesWithBets = contest.outcomes.filter(o => o.totalBet > 0 && !o.isLocked);
  const favorite = outcomesWithBets.length > 0
    ? [...outcomesWithBets].sort((a, b) => a.odds - b.odds || b.totalBet - a.totalBet)[0]
    : null;

  const favSharePct = favorite && runnerBetsTotal > 0
    ? (favorite.totalBet / runnerBetsTotal) * 100
    : null;

  return (
    <div className="compact-top-odds-bar cosmos-panel">
      <div className="compact-top-odds-meta">
        <div className="compact-top-odds-left">
          <span className="compact-top-title">{contest.title}</span>
          <span className="dock-pot-tag">
            <Coins size={11} color="#fbbf24" />
            <strong>{contest.totalPool.toLocaleString()} pts</strong>
          </span>

          {favorite ? (
            <span className="dock-fav-tag" title={`Favorite: #${favorite.number} ${favorite.name} (${favorite.odds.toFixed(2)}x)`}>
              <Flame size={11} color="#f59e0b" />
              <span className="dock-fav-label">Fav:</span>
              <strong className="dock-fav-name">#{favorite.number} {favorite.name}</strong>
              <span className="fav-odds-pill">{favorite.odds.toFixed(2)}x</span>
              <span className="fav-pct-pill">
                {favSharePct !== null ? `${favSharePct.toFixed(0)}%` : `${favorite.percentage.toFixed(0)}%`}
              </span>
            </span>
          ) : (
            <span className="compact-top-even-tag">
              <Sparkles size={11} color="#94a3b8" />
              <span>Even Starting Odds</span>
            </span>
          )}
        </div>

        <span className="compact-top-runners-count">
          {contest.outcomes.filter(o => !o.isLocked).length}/{contest.outcomes.length} Racers
        </span>
      </div>

      {/* Proportional Colored Odds Ribbon */}
      <div className="compact-top-ribbon-bar">
        {runnerBetsTotal > 0 ? (
          contest.outcomes.map(o => {
            if (o.totalBet <= 0) return null;
            const share = (o.totalBet / runnerBetsTotal) * 100;
            return (
              <div
                key={o.id}
                className={`compact-ribbon-slice ${o.id === favorite?.id ? 'is-slice-fav' : ''}`}
                style={{ width: `${share}%`, backgroundColor: o.color }}
                title={`#${o.number} ${o.name}: ${share.toFixed(1)}% (${o.totalBet.toLocaleString()} pts) | ${o.odds.toFixed(2)}x payout • Click to bet`}
                onClick={() => onQuickBetOnOutcome(o.id)}
              >
                {share >= 5 && <span className="slice-number">#{o.number}</span>}
                {share >= 12 && <span className="slice-pct">{share.toFixed(0)}%</span>}
              </div>
            );
          })
        ) : (
          contest.outcomes.map(o => (
            <div
              key={o.id}
              className="compact-ribbon-slice slice-unfunded"
              style={{ width: `${100 / (contest.outcomes.length || 1)}%`, backgroundColor: o.color }}
              title={`#${o.number} ${o.name}: 0 pts`}
              onClick={() => onQuickBetOnOutcome(o.id)}
            >
              {contest.outcomes.length <= 12 && <span className="slice-number slice-number-dim">#{o.number}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
