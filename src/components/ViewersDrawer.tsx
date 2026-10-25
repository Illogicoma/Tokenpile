import { X } from 'lucide-react';
import type { UserRosterItem, BetOutcome } from '../types/betting';
import { UserRosterPanel } from './UserRosterPanel';

interface ViewersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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

export const ViewersDrawer = ({
  isOpen,
  onClose,
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
  title,
  emoji,
  onUpdateTitle,
  onOpenIconEditor,
  isAdmin = true
}: ViewersDrawerProps) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <span style={{ fontFamily: "'Merge One', system-ui, sans-serif", fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.95rem' }}>{title || 'Viewers'} Drawer</span>
          <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <UserRosterPanel 
            users={users}
            outcomes={outcomes}
            onBet={onBet}
            onOpenTokenMaker={onOpenTokenMaker}
            onSimulateRandomBets={onSimulateRandomBets}
            isSwarmActive={isSwarmActive}
            swarmCount={swarmCount}
            onToggleSwarm={onToggleSwarm}
            onAddUser={onAddUser}
            onRemoveUser={onRemoveUser}
            onUpdateUserPoints={onUpdateUserPoints}
            onSetAllPoints={onSetAllPoints}
            onAddPointsToAll={onAddPointsToAll}
            onClearAllPoints={onClearAllPoints}
            isDebugMode={isDebugMode}
            onToggleDebugMode={onToggleDebugMode}
            title={title}
            emoji={emoji}
            onUpdateTitle={onUpdateTitle}
            onOpenIconEditor={onOpenIconEditor}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
};
