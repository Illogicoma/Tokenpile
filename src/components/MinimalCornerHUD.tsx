import { Coins, Maximize2, Bot, Play, Lock } from 'lucide-react';
import type { Contest } from '../types/betting';

interface MinimalCornerHUDProps {
  contest: Contest;
  onExpandToFullUi: () => void;
  onSimulateBet: () => void;
  onToggleStatus: () => void;
}

export const MinimalCornerHUD = ({
  contest,
  onExpandToFullUi,
  onSimulateBet,
  onToggleStatus
}: MinimalCornerHUDProps) => {
  return (
    <div className="minimal-corner-hud cosmos-panel">
      <div className="minimal-hud-row">
        <button 
          className={`dock-status-pill status-${contest.status}`}
          onClick={onToggleStatus}
          title={contest.status === 'open' ? 'Lock bets' : 'Reopen bets'}
        >
          {contest.status === 'open' ? <Play size={10} /> : <Lock size={10} />}
          <span>{contest.status.toUpperCase()}</span>
        </button>

        <span className="minimal-hud-title">{contest.title}</span>

        <span className="minimal-hud-pot">
          <Coins size={12} color="#fbbf24" />
          <strong>{contest.totalPool.toLocaleString()} pts</strong>
        </span>

        <button 
          className="minimal-hud-btn" 
          onClick={onSimulateBet}
          title="Simulate 1 chat bet"
        >
          <Bot size={11} /> +Bet
        </button>

        <button 
          className="minimal-hud-btn-highlight" 
          onClick={onExpandToFullUi}
          title="Expand to Full Dashboard"
        >
          <Maximize2 size={12} /> Expand
        </button>
      </div>
    </div>
  );
};
