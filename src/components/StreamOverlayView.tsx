import { Coins, Play, Lock, Trophy } from 'lucide-react';
import type { Contest } from '../types/betting';
import { IconDisplay } from './IconDisplay';

interface StreamOverlayViewProps {
  contest: Contest;
  onExitOverlayMode: () => void;
}

export const StreamOverlayView = ({
  contest,
  onExitOverlayMode
}: StreamOverlayViewProps) => {
  return (
    <div className="stream-overlay-hud">
      {/* Top Broadcast Ticker Banner */}
      <div className="overlay-top-banner">
        <div className="overlay-title-group">
          <span className={`status-badge status-${contest.status}`}>
            {contest.status === 'open' && <Play size={12} />}
            {contest.status === 'locked' && <Lock size={12} />}
            {contest.status === 'resolved' && <Trophy size={12} />}
            {contest.status.toUpperCase()}
          </span>
          <h1 className="overlay-contest-title">{contest.title}</h1>
        </div>

        <div className="overlay-pot-group">
          <Coins size={18} color="#fbbf24" />
          <span className="overlay-pot-text">
            TOTAL POT: <strong>{contest.totalPool.toLocaleString()} pts</strong>
          </span>
        </div>

        <button 
          className="overlay-exit-btn" 
          onClick={onExitOverlayMode}
          title="Exit OBS Stream View to Admin Dashboard"
        >
          Exit OBS View
        </button>
      </div>

      {/* Entrants Odds Ribbon */}
      <div className="overlay-entrants-ribbon">
        <div className="entrants-ribbon-track">
          {contest.outcomes.map(outcome => (
            <div 
              key={outcome.id} 
              className={`ribbon-item ${contest.winningOutcomeId === outcome.id ? 'ribbon-winner' : ''}`}
              style={{ borderBottomColor: outcome.color }}
            >
              <div className="ribbon-id-row">
                <span className="ribbon-num" style={{ backgroundColor: outcome.color }}>#{outcome.number}</span>
                <span className="ribbon-icon"><IconDisplay icon={outcome.icon} className="entrant_icon_emoji" /></span>
                <span className="ribbon-name">{outcome.name}</span>
              </div>
              <div className="ribbon-stats-row">
                <span className="ribbon-odds">
                  {outcome.totalBet > 0 ? `${outcome.odds.toFixed(2)}x` : '--'}
                </span>
                <span className="ribbon-pts">{outcome.totalBet.toLocaleString()} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
