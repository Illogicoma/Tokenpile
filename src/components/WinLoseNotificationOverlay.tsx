import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Skull, Flame, UserPlus, UserMinus } from 'lucide-react';
import { IconDisplay } from './IconDisplay';

export interface FloatingNotification {
  id: string;
  type: 'win' | 'lose' | 'drop' | 'join' | 'leave';
  userName: string;
  userEmoji: string;
  amount: number;
  outcomeName?: string;
  timestamp: number;
}

interface DisplayNotification extends FloatingNotification {
  isFadingOut?: boolean;
}

interface WinLoseNotificationOverlayProps {
  notifications: FloatingNotification[];
  onDismiss: (id: string) => void;
  leftOffset?: number;
  rightOffset?: number;
  isViewersOnLeft?: boolean;
  isViewersOnRight?: boolean;
  oddsPlacement?: 'top' | 'bottom';
  showOddsBar?: boolean;
}

export const WinLoseNotificationOverlay: React.FC<WinLoseNotificationOverlayProps> = ({
  notifications,
  onDismiss,
  leftOffset,
  rightOffset,
  isViewersOnLeft = true,
  isViewersOnRight = false,
  oddsPlacement = 'top',
  showOddsBar = true,
}) => {
  const [displayItems, setDisplayItems] = useState<DisplayNotification[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all pending timers on unmount
  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach(t => clearTimeout(t));
      activeTimers.clear();
    };
  }, []);

  // Process incoming notifications: cap at 3 visible, fading out the topmost on new entries
  useEffect(() => {
    const incoming = notifications.filter(n => !processedIdsRef.current.has(n.id));
    if (incoming.length === 0) return;

    // Mark as processed
    incoming.forEach(n => processedIdsRef.current.add(n.id));

    setDisplayItems(prev => {
      const activeItems = prev.filter(item => !item.isFadingOut);
      const fadingItems = prev.filter(item => item.isFadingOut);

      // Determine how many active items need to fade out from the top
      // Total active after adding incoming would be activeItems.length + incoming.length
      const totalAfter = activeItems.length + incoming.length;
      const overflowCount = Math.max(0, totalAfter - 3);

      const toFadeOutIds = new Set(
        activeItems.slice(0, overflowCount).map(i => i.id)
      );

      // Start fade-out timer for overflowing topmost items
      toFadeOutIds.forEach(id => {
        // Clear existing auto-dismiss timer
        const existingTimer = timersRef.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);

        // Remove after fade-out transition duration (260ms)
        const removeTimer = setTimeout(() => {
          setDisplayItems(curr => curr.filter(item => item.id !== id));
          onDismiss(id);
          timersRef.current.delete(id);
        }, 260);
        timersRef.current.set(id, removeTimer);
      });

      const updatedActive = activeItems.map(item => {
        if (toFadeOutIds.has(item.id)) {
          return { ...item, isFadingOut: true };
        }
        return item;
      });

      // Keep at most the 3 latest incoming if an extreme burst arrives
      const incomingToDisplay: DisplayNotification[] = incoming.slice(-3).map(n => ({
        ...n,
        isFadingOut: false
      }));

      // Set auto-dismiss timers (4.5s) for the new items
      incomingToDisplay.forEach(n => {
        const autoTimer = setTimeout(() => {
          // Trigger fade-out
          setDisplayItems(curr =>
            curr.map(item => (item.id === n.id ? { ...item, isFadingOut: true } : item))
          );

          // Remove after fade-out transition completes
          const removeTimer = setTimeout(() => {
            setDisplayItems(curr => curr.filter(item => item.id !== n.id));
            onDismiss(n.id);
            timersRef.current.delete(n.id);
          }, 260);
          timersRef.current.set(n.id, removeTimer);
        }, 4500);

        timersRef.current.set(n.id, autoTimer);
      });

      return [...fadingItems, ...updatedActive, ...incomingToDisplay];
    });
  }, [notifications, onDismiss]);

  if (displayItems.length === 0) return null;

  // Position aligned with the contest-odds-bar cosmos-panel left edge (16px grid padding + leftSidebarWidth + 16px grid gap)
  const bottomOffset = showOddsBar && oddsPlacement === 'bottom' ? '82px' : '20px';

  const containerStyle: React.CSSProperties = isViewersOnRight
    ? {
        position: 'fixed',
        right: `${(rightOffset ?? 320) + 32}px`,
        bottom: bottomOffset,
        zIndex: 120,
      }
    : {
        position: 'fixed',
        left: isViewersOnLeft ? `${(leftOffset ?? 320) + 32}px` : '16px',
        bottom: bottomOffset,
        zIndex: 120,
      };

  return (
    <div className="floating-notifications-container" style={containerStyle}>
      {displayItems.map(item => {
        const isWin = item.type === 'win';
        const isDrop = item.type === 'drop';
        const isJoin = item.type === 'join';
        const isLeave = item.type === 'leave';

        const badgeClass = isWin 
          ? 'badge-win' 
          : isDrop 
            ? 'badge-drop' 
            : isJoin 
              ? 'badge-join' 
              : isLeave 
                ? 'badge-leave' 
                : 'badge-lose';

        const tagText = isWin 
          ? 'Win' 
          : isDrop 
            ? 'Bet' 
            : isJoin 
              ? 'Joined' 
              : isLeave 
                ? 'Left' 
                : 'Bust';

        return (
          <div 
            key={item.id} 
            className={`floating-badge ${badgeClass} ${item.isFadingOut ? 'is-fading-out' : ''}`}
          >
            <div className="badge-avatar-box">
              <IconDisplay 
                icon={item.userEmoji || (isWin ? '🏆' : isDrop ? '🪙' : isJoin ? '👋' : isLeave ? '🚪' : '💀')} 
                className="badge-emoji" 
                style={{ width: '22px', height: '22px' }}
              />
              {isWin && (
                <div className="badge-star-burst">
                  <Sparkles size={11} color="#10b981" />
                </div>
              )}
            </div>

            <div className="badge-details">
              <div className="badge-user-row">
                <span className="badge-username" title={item.userName}>
                  {item.userName}
                </span>
                <span className="badge-tag-pill">
                  {tagText}
                </span>
              </div>

              <div className="badge-amount-row">
                {isWin ? (
                  <>
                    <span className="badge-amount-val badge-gain-text">
                      <Sparkles size={11} color="#059669" /> +{item.amount.toLocaleString()} PTS
                    </span>
                    {item.outcomeName && (
                      <span className="badge-target-label" title={item.outcomeName}>
                        on {item.outcomeName}
                      </span>
                    )}
                  </>
                ) : isDrop ? (
                  <>
                    <span className="badge-amount-val badge-drop-text">
                      <Flame size={11} color="#f59e0b" /> {item.amount.toLocaleString()} PTS
                    </span>
                    {item.outcomeName && (
                      <span className="badge-target-label" title={item.outcomeName}>
                        on {item.outcomeName}
                      </span>
                    )}
                  </>
                ) : isJoin ? (
                  <>
                    <span className="badge-amount-val badge-join-text">
                      <UserPlus size={11} color="#0891b2" /> Joined Lobby
                    </span>
                    <span className="badge-target-label">
                      +{item.amount.toLocaleString()} PTS
                    </span>
                  </>
                ) : isLeave ? (
                  <>
                    <span className="badge-amount-val badge-leave-text">
                      <UserMinus size={11} color="#64748b" /> Left Lobby
                    </span>
                    <span className="badge-target-label">
                      Departed
                    </span>
                  </>
                ) : (
                  <>
                    <span className="badge-amount-val badge-loss-text">
                      <Skull size={11} color="#ef4444" /> -{item.amount.toLocaleString()} PTS
                    </span>
                    <span className="badge-target-label">
                      Busted
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
