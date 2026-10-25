import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowUpRight, TrendingDown, Sliders } from 'lucide-react';
import type { WinCelebrationData, CelebrationHeaderConfig } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { IconDisplay } from './IconDisplay';
import { getPodiumColor } from '../utils/podiumColors';
import { styleService } from '../services/styleService';
import { storageService } from '../services/storageService';
import { CelebrationHeaderEditor } from './CelebrationHeaderEditor';
import { AnimatedTokenCounter } from './AnimatedTokenCounter';

const VICTORY_PHRASES = [
  'VICTORY!',
  'CHAMPION CROWNED!',
  'WE HAVE A WINNER!',
  'GLORIOUS FINISH!',
  'JACKPOT PAYOUT!',
  'TRIUMPHANT WIN!',
  'FIRST ACROSS THE LINE!',
  'THE CROWD GOES WILD!',
  'TAKE IT TO THE BANK!',
  'GOLDEN TRIUMPH!',
  'WHAT A FINISH!',
  'UNSTOPPABLE!',
];

interface WinnerCelebrationModalProps {
  data: WinCelebrationData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayouts: () => void;
  headerConfig?: CelebrationHeaderConfig;
  onUpdateHeaderConfig?: (config: CelebrationHeaderConfig) => void;
}

export const WinnerCelebrationModal = ({
  data,
  isOpen,
  onClose,
  onConfirmPayouts,
  headerConfig,
  onUpdateHeaderConfig
}: WinnerCelebrationModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [localHeaderConfig, setLocalHeaderConfig] = useState<CelebrationHeaderConfig>(() => 
    headerConfig || storageService.getCelebrationHeaderConfig()
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [victoryPhrase, setVictoryPhrase] = useState<string>('VICTORY!');

  useEffect(() => {
    if (headerConfig) {
      setLocalHeaderConfig(headerConfig);
    }
  }, [headerConfig]);

  useEffect(() => {
    if (isOpen) {
      const chosen = VICTORY_PHRASES[Math.floor(Math.random() * VICTORY_PHRASES.length)];
      setVictoryPhrase(chosen);
    }
  }, [isOpen]);

  const handleHeaderConfigChange = (newConfig: CelebrationHeaderConfig) => {
    setLocalHeaderConfig(newConfig);
    storageService.saveCelebrationHeaderConfig(newConfig);
    onUpdateHeaderConfig?.(newConfig);
  };

  useEffect(() => {
    if (!isOpen || !data) return;

    soundEffects.playWinnerFanfare();

    // Confetti animation loop
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      opacity: number;
    }[] = [];

    const colors = [
      data.winningOutcome.color,
      '#fbbf24', // Gold
      '#38bdf8', // Cyan
      '#f43f5e', // Rose
      '#a855f7', // Purple
      '#ffffff'
    ];

    for (let i = 0; i < 160; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 240,
        y: canvas.height * 0.32 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.985;
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, p.opacity - 0.003);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const { winningOutcome, totalPool, oddsMultiplier, winners, losers } = data;

  const handleConfirmClick = () => {
    setIsFadingOut(true);
    onConfirmPayouts();
    setTimeout(() => {
      onClose();
      setIsFadingOut(false);
    }, 450);
  };

  return (
    <div className={`celebration-overlay ${isFadingOut ? 'fading-out' : ''}`}>
      <canvas ref={canvasRef} className="confetti-canvas" />

      <div className="celebration-dialog">
        {/* Top-Right Window Controls: Customize Header Icon + Close Button */}
        <div className="celebration-window-controls">
          <button
            type="button"
            className={`celebration-control-btn celebration-customize-btn ${isEditorOpen ? 'active' : ''}`}
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            title={isEditorOpen ? 'Close Header Settings' : 'Customize Header Banner Image'}
            aria-label="Customize Header Banner Image"
          >
            <Sliders size={16} />
          </button>
          <button
            type="button"
            className="celebration-control-btn celebration-close-btn"
            onClick={onClose}
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Victory Header with Background Image & Centered Icon */}
        {(() => {
          const activeHeader = headerConfig || localHeaderConfig;
          const effectiveBgImage = activeHeader.imageUrl || styleService.getImage('tp_victory.png');

          return (
            <>
              <div
                className="celebration-victory-header"
                style={{
                  backgroundImage: `url("${effectiveBgImage}")`,
                  backgroundPosition: `${activeHeader.imagePosX}% ${activeHeader.imagePosY}%`,
                  backgroundSize: activeHeader.imageScale === 100 ? 'contain' : `${activeHeader.imageScale}%`,
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Centered Winner Icon on Medal Rosette */}
                <div
                  className="celebration-medal-icon-slot"
                  style={{
                    left: `${activeHeader.iconPosX}%`,
                    top: `${activeHeader.iconPosY}%`,
                    width: `${17.2 * (activeHeader.iconScale / 100)}%`,
                  }}
                >
                  <div
                    className="celebration-medal-token-disc"
                    style={{
                      boxShadow: `0 0 24px ${winningOutcome.color}bb, inset 0 0 10px rgba(0, 0, 0, 0.45)`,
                    }}
                    title={winningOutcome.name}
                  >
                    <IconDisplay icon={winningOutcome.icon} fallback="🏆" />
                  </div>
                </div>
              </div>

              {/* Interactive Twitter-style Header Editor Drawer */}
              {isEditorOpen && (
                <div className="celebration-editor-wrapper">
                  <CelebrationHeaderEditor
                    config={activeHeader}
                    onChange={handleHeaderConfigChange}
                    onClose={() => setIsEditorOpen(false)}
                    previewIcon={winningOutcome.icon}
                    previewColor={winningOutcome.color}
                    previewName={winningOutcome.name}
                  />
                </div>
              )}
            </>
          );
        })()}

        {/* Hero Winner Banner */}
        <div className="celebration-hero">
          <div className="winner-subtitle">
            <Sparkles size={16} className="subtitle-sparkle" />
            <span>{victoryPhrase}</span>
            <Sparkles size={16} className="subtitle-sparkle" />
          </div>

          {/* Multi-Winner Podium Showcase (Playful, Colorful Horse Card Style) */}
          {data.podiumOutcomes && data.podiumOutcomes.length > 1 ? (
            <div className="celebration-podium-showcase">
              {data.podiumOutcomes.map((pod) => {
                const pColor = getPodiumColor(pod.place, data.podiumOutcomes?.length || 3);
                const rankEmoji = pod.place === 1 ? '🥇' : pod.place === 2 ? '🥈' : pod.place === 3 ? '🥉' : '🎖️';
                const rankTitle = pod.place === 1 ? '1ST PLACE' : pod.place === 2 ? '2ND PLACE' : pod.place === 3 ? '3RD PLACE' : `${pod.place}TH PLACE`;

                return (
                  <div
                    key={pod.outcome.id}
                    className="celebration-podium-card rainbow-card-shine"
                    style={{
                      borderColor: pColor.hex,
                      boxShadow: `0 8px 22px rgba(0, 0, 0, 0.22), 0 0 16px ${pColor.hex}44`,
                    }}
                  >
                    {/* Metallic Podium Rank Banner */}
                    <div
                      className="podium-card-rank-badge"
                      style={{
                        background: `linear-gradient(135deg, ${pColor.lightHex} 0%, ${pColor.hex} 55%, ${pColor.darkHex} 100%)`,
                        color: pColor.textContrast,
                        borderColor: pColor.darkHex,
                      }}
                    >
                      <span className="podium-rank-icon">{rankEmoji}</span>
                      <span className="podium-rank-label">{rankTitle}</span>
                    </div>

                    {/* Chunky Tactile Entrant Color Strip */}
                    <div
                      className="podium-card-color-banner"
                      style={{
                        backgroundColor: pod.outcome.color,
                      }}
                    >
                      <span className="podium-banner-num">#{pod.outcome.number}</span>
                      <span className="podium-banner-icon">
                        <IconDisplay icon={pod.outcome.icon} />
                      </span>
                    </div>

                    {/* Entrant Name & Inset Stats */}
                    <div className="podium-card-body">
                      <div className="podium-entrant-name" title={pod.outcome.name}>
                        {pod.outcome.name}
                      </div>

                      <div className="podium-stat-capsule share-capsule">
                        <div className="capsule-primary">
                          <span className="share-pct">{pod.sharePct}%</span>
                          <span className="share-label">pot</span>
                        </div>
                        <div className="capsule-sub">
                          ({pod.poolShare.toLocaleString()} pts)
                        </div>
                      </div>

                      <div className="podium-stat-capsule odds-capsule">
                        <span className="odds-val">{pod.oddsMultiplier.toFixed(2)}x</span>
                        <span className="odds-divider">•</span>
                        <span className="bets-val">{pod.bettorCount} bets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="celebration-single-winner-badge" style={{ borderColor: winningOutcome.color }}>
              <div className="single-winner-color-strip" style={{ backgroundColor: winningOutcome.color }}>
                <span className="single-winner-num">#{winningOutcome.number}</span>
                <span className="single-winner-icon">
                  <IconDisplay icon={winningOutcome.icon} fallback="🏆" />
                </span>
              </div>
              <div className="single-winner-name-wrap">
                <span className="single-winner-crown">👑</span>
                <span className="single-winner-name">{winningOutcome.name}</span>
              </div>
            </div>
          )}

          <div className="winner-stats-pills">
            <div className="winner-pill">
              <Sparkles size={14} color="#fbbf24" />
              <span>TOTAL POT: <strong>{totalPool.toLocaleString()} pts</strong></span>
            </div>
            <div className="winner-pill">
              <span>{data.podiumOutcomes && data.podiumOutcomes.length > 1 ? `PODIUM: ${data.podiumOutcomes.length} PLACES` : `FINAL ODDS: ${oddsMultiplier.toFixed(2)}x`}</span>
            </div>
            <div className="winner-pill">
              <span>WINNERS: <strong>{winners.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Winners & Payout Leaderboard */}
        <div className="celebration-content">
          <div className="payout-columns">
            {/* Winners Column */}
            <div className="payout-card-column">
              <div className="column-header-winner">
                <ArrowUpRight size={16} /> WINNERS PAYOUT ROSTER ({winners.length})
              </div>

              <div className="payout-scroll-list">
                {winners.length === 0 ? (
                  <div className="empty-payout-notice">
                    No viewers placed bets on this outcome! House keeps the pool.
                  </div>
                ) : (
                  winners.map((winner, idx) => {
                    const winnerPodColor = winner.place
                      ? getPodiumColor(winner.place, data.podiumOutcomes?.length || 3)
                      : null;

                    return (
                      <div
                        key={`${winner.userId}_${winner.place || 1}_${idx}`}
                        className="winner-row-card rainbow-card-shine"
                        style={winnerPodColor ? {
                          borderLeft: `3px solid ${winnerPodColor.hex}`,
                        } : undefined}
                      >
                        <div className="winner-avatar">
                          <IconDisplay icon={winner.config.emoji} style={{ width: '22px', height: '22px' }} />
                          {idx === 0 && <span className="mvp-crown">👑</span>}
                        </div>

                        <div className="winner-info">
                          <div className="winner-name-row">
                            <span className="winner-username">{winner.userName}</span>
                            {winner.place && winnerPodColor && (
                              <span
                                className="winner-place-tag"
                                style={{
                                  background: `linear-gradient(135deg, ${winnerPodColor.lightHex} 0%, ${winnerPodColor.hex} 100%)`,
                                  color: winnerPodColor.textContrast,
                                  borderColor: winnerPodColor.darkHex,
                                }}
                              >
                                #{winner.place}
                              </span>
                            )}
                            {idx === 0 && <span className="winner-tag">TOP WINNER</span>}
                          </div>
                          <div className="winner-stake">
                            {winner.outcomeName ? `${winner.outcomeName} • ` : ''}Bet: {winner.betAmount.toLocaleString()} pts
                          </div>
                        </div>

                        <div className="winner-payout-val">
                          +<AnimatedTokenCounter value={winner.payout} isWin={true} />
                          <span className="pts-label">pts</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Losers Summary Column */}
            <div className="payout-card-column loser-column">
              <div className="column-header-loser">
                <TrendingDown size={16} /> BUSTED BETS ({losers.length})
              </div>

              <div className="payout-scroll-list">
                {losers.length === 0 ? (
                  <div className="empty-payout-notice">No losing bets!</div>
                ) : (
                  losers.map(loser => (
                    <div key={loser.userId} className="loser-row-card">
                      <span className="loser-username">{loser.userName}</span>
                      <span className="loser-lost-val">-{loser.betAmount.toLocaleString()} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="celebration-footer">
            <button className="celebration-cancel-btn" onClick={onClose}>
              Dismiss
            </button>
            <button 
              className="celebration-confirm-btn" 
              style={{ backgroundColor: winningOutcome.color }}
              onClick={handleConfirmClick}
            >
              Distribute Payouts & Open Bucket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
