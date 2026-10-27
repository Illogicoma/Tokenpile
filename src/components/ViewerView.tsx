import React, { useState, useEffect, useMemo } from 'react';
import type { Contest, BetOutcome, UserTokenConfig } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { storageService, broadcastStreamSync } from '../services/storageService';
import { twitchExtensionService } from '../services/twitchExtensionService';
import { streamRelayService } from '../services/streamRelayService';
import { PerformantTokenPreview } from './PerformantTokenPreview';
import { IconPicker } from './IconPicker';
import { IconDisplay, isImageSource } from './IconDisplay';
import { AnimatedTokenCounter } from './AnimatedTokenCounter';
import {
  Trophy,
  Coins,
  Lock,
  Volume2,
  VolumeX,
  Copy,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

const TwitchGlitchIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

interface ViewerViewProps {
  contest: Contest;
  onExitViewerMode?: () => void;
  isAdmin?: boolean;
}

interface ViewerBetHistoryItem {
  id: string;
  outcomeId: string;
  outcomeName: string;
  horseNumber: number;
  horseColor: string;
  amount: number;
  odds: number;
  potentialPayout: number;
  timestamp: number;
  status: 'pending' | 'won' | 'lost';
  actualPayout?: number;
  place?: number;
}

const DEFAULT_LUCKY_COINS = ['🥕', '👑', '💎', '⚡', '🐎', '🚀', '🦊', '🍀', '🔥', '🏆', '👾', '🦄'];

const COLOR_PRESETS = [
  { name: 'Pure Gold', color: '#fbbf24', metal: 0.95, rough: 0.15, finish: 'gem' as const },
  { name: 'Chrome Mirror', color: '#f1f5f9', metal: 1.0, rough: 0.05, finish: 'chrome' as const },
  { name: 'Rose Gold', color: '#fb7185', metal: 0.85, rough: 0.2, finish: 'standard' as const },
  { name: 'Obsidian', color: '#334155', metal: 0.7, rough: 0.25, finish: 'standard' as const },
  { name: 'Cyber Neon', color: '#06b6d4', metal: 0.4, rough: 0.3, finish: 'neon' as const },
  { name: 'Emerald', color: '#10b981', metal: 0.85, rough: 0.15, finish: 'gem' as const },
  { name: 'Amethyst', color: '#a855f7', metal: 0.9, rough: 0.15, finish: 'gem' as const },
  { name: 'Ruby', color: '#ef4444', metal: 0.85, rough: 0.2, finish: 'gem' as const },
  { name: 'Bronze', color: '#d97706', metal: 0.8, rough: 0.35, finish: 'standard' as const },
  { name: 'Matte Clay', color: '#cbd5e1', metal: 0.0, rough: 0.9, finish: 'matte' as const },
];

export const ViewerView: React.FC<ViewerViewProps> = ({
  contest: initialContest,
  onExitViewerMode: _onExitViewerMode,
  isAdmin: _isAdmin = false
}) => {
  // Live synced contest state
  const [liveContest, setLiveContest] = useState<Contest>(initialContest);

  // Sync contest updates in real-time when Streamer OBS broadcasts
  useEffect(() => {
    setLiveContest(initialContest);
  }, [initialContest]);

  useEffect(() => {
    const unsubscribe = streamRelayService.onContestUpdate((updatedContest) => {
      setLiveContest(updatedContest);
    });
    return unsubscribe;
  }, []);

  // Load broadcaster's persistent entrant roster & contest settings from Twitch Configuration Service
  useEffect(() => {
    const handleTwitchConfigSync = () => {
      const config = twitchExtensionService.getConfiguration('broadcaster');
      if (config?.content) {
        try {
          const parsed = JSON.parse(config.content);
          if (parsed?.contest) {
            setLiveContest(prev => ({
              ...prev,
              ...parsed.contest,
              outcomes: parsed.contest.outcomes || prev.outcomes
            }));
          }
        } catch (e) {
          console.warn('[ViewerView] Could not parse broadcaster config:', e);
        }
      }
    };

    handleTwitchConfigSync();
    const unsub = twitchExtensionService.onConfigurationChanged(handleTwitchConfigSync);
    return unsub;
  }, []);

  // --- JACKBOX-STYLE JOIN / SESSION STATE ---
  const [channelInput, setChannelInput] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const c = params.get('channel') || params.get('room') || params.get('c');
        if (c) return c.trim().toLowerCase();
      }
      return localStorage.getItem('TokenPile_viewer_channel') || '';
    } catch {
      return '';
    }
  });

  const [usernameInput, setUsernameInput] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_username');
      if (stored) return stored.trim();
    } catch { }
    return `Lucky_${Math.floor(100 + Math.random() * 900)}`;
  });

  const [tokenConfig, setTokenConfig] = useState<UserTokenConfig>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_token_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.emoji && isImageSource(parsed.emoji)) {
          parsed.emoji = '🥕';
        }
        return parsed;
      }
    } catch { }
    return {
      emoji: '🥕',
      metalness: 0.85,
      roughness: 0.18,
      colorTint: '#fbbf24',
      finish: 'standard',
    };
  });

  const [tokensBalance, setTokensBalance] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_balance');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch { }
    return 50000; // 50k starting tokens
  });

  // --- TWITCH EXTENSION INTEGRATION STATE ---
  const [isTwitchExt, setIsTwitchExt] = useState(() => twitchExtensionService.isExtensionEnvironment());
  const [isIdentityShared, setIsIdentityShared] = useState(() => twitchExtensionService.isIdentityShared());
  const [twitchChannelId, setTwitchChannelId] = useState<string | null>(() => twitchExtensionService.getChannelId());
  const [isBroadcaster, setIsBroadcaster] = useState(() => twitchExtensionService.getIsBroadcaster());

  // Track if connected to streamer's room (Auto-connected if in Twitch Extension, iframe, or channel present in query / localStorage)
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (twitchExtensionService.isExtensionEnvironment()) return true;
        if (window.self !== window.top) return true; // Any embedded iframe is connected by default
        if (window.location.search) {
          const params = new URLSearchParams(window.location.search);
          if (
            params.get('channel') ||
            params.get('room') ||
            params.get('c') ||
            params.get('mode') === 'panel' ||
            params.get('mode') === 'viewer' ||
            params.get('anchor') === 'panel'
          ) {
            return true;
          }
        }
      }
      return Boolean(localStorage.getItem('TokenPile_viewer_channel'));
    } catch {
      return false;
    }
  });

  // Listen for Twitch Extension Auth & Context updates
  useEffect(() => {
    const unsubAuth = twitchExtensionService.onAuth((auth, isBroadcasterRole) => {
      setIsTwitchExt(true);
      setIsBroadcaster(isBroadcasterRole);
      setTwitchChannelId(auth.channelId);
      const shared = twitchExtensionService.isIdentityShared();
      setIsIdentityShared(shared);

      if (auth.channelId && !channelInput) {
        setChannelInput(auth.channelId);
      }

      if ((shared || isBroadcasterRole) && (auth.userId || twitchExtensionService.getUserId())) {
        const uid = auth.userId || twitchExtensionService.getUserId() || '';
        setUsernameInput(prev => prev.startsWith('Lucky_') ? (isBroadcasterRole ? 'Broadcaster' : `Twitch_${uid.slice(-4)}`) : prev);
      }

      setIsConnected(true);
    });

    const unsubTheme = twitchExtensionService.onTheme((theme) => {
      setViewerTheme(theme);
    });

    return () => {
      unsubAuth();
      unsubTheme();
    };
  }, [channelInput]);

  // Navigation tab: 'slip' | 'coin' | 'history'
  const [activeTab, setActiveTab] = useState<'slip' | 'coin' | 'history'>('slip');
  const [viewerTheme, setViewerTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { }
    return 'light';
  });

  const toggleViewerTheme = () => {
    const next = viewerTheme === 'dark' ? 'light' : 'dark';
    setViewerTheme(next);
    try {
      localStorage.setItem('TokenPile_viewer_theme', next);
    } catch { }
    soundEffects.playTokenClink();
  };

  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // Active Bet in the current race
  const [activeBet, setActiveBet] = useState<ViewerBetHistoryItem | null>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_active_bet');
      if (stored) return JSON.parse(stored);
    } catch { }
    return null;
  });

  // Bet Slip selection
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [wagerAmountInput, setWagerAmountInput] = useState<string>('500');

  // Personal Betting History
  const [betHistory, setBetHistory] = useState<ViewerBetHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('TokenPile_viewer_history');
      if (stored) return JSON.parse(stored);
    } catch { }
    return [];
  });

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleRequestIdentityLink = () => {
    if (isBroadcaster || twitchExtensionService.isIdentityShared()) {
      setIsIdentityShared(true);
      showToast('Twitch account verified!');
      return;
    }
    const sent = twitchExtensionService.requestIdentityShare();
    if (sent) {
      showToast('Please check the Twitch prompt to share your Twitch ID.');
    } else {
      showToast('Identity prompt not available. (Check Extension Capabilities in Twitch Console).');
    }
  };

  // Persist balance & active bet
  useEffect(() => {
    try {
      localStorage.setItem('TokenPile_viewer_balance', String(tokensBalance));
    } catch { }
  }, [tokensBalance]);

  useEffect(() => {
    try {
      if (activeBet) {
        localStorage.setItem('TokenPile_viewer_active_bet', JSON.stringify(activeBet));
      } else {
        localStorage.removeItem('TokenPile_viewer_active_bet');
      }
    } catch { }
  }, [activeBet]);

  useEffect(() => {
    try {
      localStorage.setItem('TokenPile_viewer_history', JSON.stringify(betHistory));
    } catch { }
  }, [betHistory]);

  // Handle Race Resolution: Check if viewer's active bet won!
  useEffect(() => {
    if (liveContest.status === 'resolved' && activeBet && activeBet.status === 'pending') {
      const winningId = liveContest.winningOutcomeId;
      const podiumIds = liveContest.podiumOutcomeIds || (winningId ? [winningId] : []);
      const placeIdx = podiumIds.indexOf(activeBet.outcomeId);

      if (placeIdx !== -1) {
        // WINNER!
        const place = placeIdx + 1;
        // Payout shares for 1st, 2nd, 3rd
        let shareMultiplier = 1.0;
        if (podiumIds.length === 2) shareMultiplier = place === 1 ? 0.70 : 0.30;
        if (podiumIds.length >= 3) shareMultiplier = place === 1 ? 0.60 : place === 2 ? 0.25 : 0.15;

        const calculatedPayout = Math.round(activeBet.potentialPayout * shareMultiplier);
        const resolvedBet: ViewerBetHistoryItem = {
          ...activeBet,
          status: 'won',
          actualPayout: calculatedPayout,
          place
        };

        setActiveBet(resolvedBet);
        setTokensBalance(prev => prev + calculatedPayout);
        setBetHistory(prev => [resolvedBet, ...prev.slice(0, 49)]);

        soundEffects.playCashout();
        soundEffects.playShineSound();
        showToast(`🏆 VICTORY! Placed #${place} on ${activeBet.outcomeName}! +${calculatedPayout.toLocaleString()} pts`);
      } else {
        // Loss
        const resolvedBet: ViewerBetHistoryItem = {
          ...activeBet,
          status: 'lost',
          actualPayout: 0
        };
        setActiveBet(resolvedBet);
        setBetHistory(prev => [resolvedBet, ...prev.slice(0, 49)]);
        soundEffects.playBetDrop();
        showToast(`Race ended! Better luck next round.`);
      }
    } else if (liveContest.status === 'open' && activeBet && activeBet.status !== 'pending') {
      // Clear resolved active bet for new open race
      setActiveBet(null);
    }
  }, [liveContest.status, liveContest.winningOutcomeId, liveContest.podiumOutcomeIds, activeBet]);

  // Connect to Jackbox-style Streamer Room
  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanChan = channelInput.trim().toLowerCase();
    const cleanUser = usernameInput.trim();

    if (!cleanChan) {
      showToast('Please enter a Channel / Room name');
      return;
    }
    if (!cleanUser) {
      showToast('Please enter your viewer nickname');
      return;
    }

    try {
      localStorage.setItem('TokenPile_viewer_channel', cleanChan);
      localStorage.setItem('TokenPile_viewer_username', cleanUser);
      localStorage.setItem('TokenPile_viewer_token_config', JSON.stringify(tokenConfig));
    } catch { }

    setIsConnected(true);
    soundEffects.playCashout();
    showToast(`Connected to ${cleanChan}'s room!`);
  };

  const handleDisconnect = () => {
    if (isTwitchExt) {
      showToast(`Connected via Twitch Extension (Channel #${twitchChannelId || channelInput})`);
      return;
    }
    setIsConnected(false);
    try {
      localStorage.removeItem('TokenPile_viewer_channel');
    } catch { }
    soundEffects.playTokenClink();
  };

  const handleToggleMute = () => {
    const next = !soundEffects.getMuted();
    soundEffects.setMuted(next);
    setIsMuted(next);
  };

  // Place Bet
  const handlePlaceBet = () => {
    if (!selectedOutcomeId) {
      showToast('Select a runner to bet on first!');
      return;
    }
    if (liveContest.status !== 'open') {
      showToast('Bets are currently locked!');
      soundEffects.playLockBuzzer();
      return;
    }

    const amount = parseInt(wagerAmountInput, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Enter a valid bet amount');
      return;
    }
    if (amount > tokensBalance) {
      showToast("Insufficient token balance!");
      soundEffects.playLockBuzzer();
      return;
    }

    const targetOutcome = liveContest.outcomes.find(o => o.id === selectedOutcomeId);
    if (!targetOutcome || targetOutcome.isLocked) {
      showToast('This runner is unavailable');
      return;
    }

    const odds = targetOutcome.odds || 2.0;
    const potentialPayout = Math.round(amount * odds);

    const newBet: ViewerBetHistoryItem = {
      id: `vb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      outcomeId: targetOutcome.id,
      outcomeName: targetOutcome.name,
      horseNumber: targetOutcome.number,
      horseColor: targetOutcome.color,
      amount,
      odds,
      potentialPayout,
      timestamp: Date.now(),
      status: 'pending',
    };

    // Deduct balance
    setTokensBalance(prev => prev - amount);
    setActiveBet(newBet);

    // Determine user identifier: Twitch verified User ID if linked, or viewer_name
    const effectiveUserId = isIdentityShared && twitchExtensionService.getUserId()
      ? `twitch_${twitchExtensionService.getUserId()}`
      : `viewer_${usernameInput.toLowerCase()}`;

    // Broadcast bet request to Streamer OBS via BroadcastChannel & Twitch PubSub Whisper
    streamRelayService.sendViewerBet({
      userId: effectiveUserId,
      userName: usernameInput,
      amount,
      outcomeId: targetOutcome.id,
      outcomeName: targetOutcome.name,
      tokenConfig,
      userConfig: tokenConfig
    });

    // Auto-copy chat command so viewer can paste into Twitch chat
    const botPrefix = storageService.getTwitchChatConfig().botPrefix || '!bet';
    const chatCmd = `${botPrefix} ${targetOutcome.number} ${amount}`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(chatCmd).catch(() => {});
      }
    } catch { }

    soundEffects.playBetDrop();
    showToast(`✓ Copied "${chatCmd}" to clipboard! Paste into Twitch Chat to drop on stream.`);

    // Reset selection drawer
    setSelectedOutcomeId(null);
  };

  // Copy Twitch Chat Command to clipboard
  const handleCopyChatCommand = (outcomeOrNumber: BetOutcome | number, amount: number) => {
    const num = typeof outcomeOrNumber === 'number' ? outcomeOrNumber : outcomeOrNumber.number;
    const botPrefix = storageService.getTwitchChatConfig().botPrefix || '!bet';
    const cmd = `${botPrefix} ${num} ${amount}`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd);
        showToast(`Copied "${cmd}" to clipboard! Paste into Twitch chat.`);
        soundEffects.playTokenClink();
      }
    } catch { }
  };

  // Quick chips
  const handleQuickChip = (amount: number) => {
    const clamped = Math.min(tokensBalance, Math.max(1, amount));
    setWagerAmountInput(String(clamped));
    soundEffects.playTokenClink();
  };

  const handleAllIn = () => {
    setWagerAmountInput(String(tokensBalance));
    soundEffects.playTokenClink();
  };

  // Selected runner object
  const selectedOutcome = useMemo(() => {
    return liveContest.outcomes.find(o => o.id === selectedOutcomeId) || null;
  }, [liveContest.outcomes, selectedOutcomeId]);

  // Calculated potential return for drawer
  const potentialReturn = useMemo(() => {
    if (!selectedOutcome) return 0;
    const amt = parseInt(wagerAmountInput, 10);
    if (isNaN(amt) || amt <= 0) return 0;
    return Math.round(amt * (selectedOutcome.odds || 2.0));
  }, [selectedOutcome, wagerAmountInput]);

  // History stats
  const historyStats = useMemo(() => {
    let totalWagered = 0;
    let totalWon = 0;
    let winsCount = 0;
    let completedCount = 0;

    for (const b of betHistory) {
      totalWagered += b.amount;
      if (b.status === 'won') {
        totalWon += b.actualPayout || 0;
        winsCount++;
        completedCount++;
      } else if (b.status === 'lost') {
        completedCount++;
      }
    }

    const netProfit = totalWon - totalWagered;
    const winRate = completedCount > 0 ? Math.round((winsCount / completedCount) * 100) : 0;

    return { totalWagered, totalWon, netProfit, winRate, count: betHistory.length };
  }, [betHistory]);

  // --------------------------------------------------------------------------
  // SCREEN 1: JACKBOX-STYLE JOIN ROOM (If not connected)
  // --------------------------------------------------------------------------
  if (!isConnected) {
    return (
      <div className={`viewer-mode-root theme-${viewerTheme}`}>
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <button
            type="button"
            className="viewer-theme-toggle-btn"
            onClick={toggleViewerTheme}
            title={viewerTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {viewerTheme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#6366f1" />}
          </button>
        </div>
        <div className="viewer-join-screen">
          <div className="viewer-join-card">
            <div className="viewer-brand-logo">🐎 TokenPile</div>
            <div className="viewer-brand-tagline">Interactive Stream Racing & Betting</div>

            <form onSubmit={handleJoinRoom}>
              {/* Streamer Channel / Room Name */}
              <div className="viewer-form-group">
                <label className="viewer-form-label">Streamer Channel / Room</label>
                <input
                  type="text"
                  className="viewer-form-input"
                  placeholder="e.g. streamer_channel"
                  value={channelInput}
                  onChange={e => setChannelInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Viewer Nickname */}
              <div className="viewer-form-group">
                <label className="viewer-form-label">Your Nickname</label>
                <input
                  type="text"
                  className="viewer-form-input"
                  placeholder="Your Twitch username..."
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                />
              </div>

              {/* Lucky Starting Coin */}
              <div className="viewer-form-group">
                <label className="viewer-form-label">Pick Your Lucky Coin</label>
                <div className="viewer-starting-coins-strip">
                  {DEFAULT_LUCKY_COINS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`viewer-coin-pick-btn ${tokenConfig.emoji === c ? 'is-active' : ''}`}
                      onClick={() => setTokenConfig(prev => ({ ...prev, emoji: c }))}
                    >
                      <IconDisplay icon={c} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Enter Room Button */}
              <button type="submit" className="viewer-join-btn">
                Enter Race Room 🎮
              </button>
            </form>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--vm-card-bg-elevated, #FDFCF7)',
              color: 'var(--vm-text-primary, #5A4A28)',
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1.5px solid var(--vm-border-active, #d97706)',
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: CONNECTED VIEWER & BET SLIP UI
  // --------------------------------------------------------------------------
  return (
    <div className={`viewer-mode-root theme-${viewerTheme}`}>
      {/* 1. Sticky Top Navigation Bar */}
      <header className="viewer-topbar">
        <div className="viewer-topbar-upper">
          {/* Room / Twitch Extension Pill */}
          <div
            className={`viewer-channel-pill ${isTwitchExt ? 'is-twitch' : ''}`}
            onClick={handleDisconnect}
            title={isTwitchExt ? "Twitch Extension Connected" : "Click to disconnect or switch room"}
          >
            <span className={`viewer-channel-dot ${isTwitchExt ? 'is-twitch-dot' : ''}`} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              {isTwitchExt && <TwitchGlitchIcon size={11} color="#a855f7" />}
              {isTwitchExt ? 'Twitch Live' : channelInput}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* Theme Toggle (Dark / Light) */}
            <button
              type="button"
              className="viewer-theme-toggle-btn"
              onClick={toggleViewerTheme}
              title={viewerTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {viewerTheme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
            </button>

            {/* Audio Mute */}
            <button
              type="button"
              className="icon-btn-ghost viewer-theme-toggle-btn"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} color="#10b981" />}
            </button>

            {/* Token Balance */}
            <div className="viewer-balance-pill">
              <Coins size={12} color="#f59e0b" />
              <span><AnimatedTokenCounter value={tokensBalance} formatCompact={true} /></span>
              <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>pts</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="viewer-topbar-tabs">
          <button
            type="button"
            className={`viewer-nav-tab ${activeTab === 'slip' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('slip')}
          >
            <span>🏇 Race Slip</span>
          </button>
          <button
            type="button"
            className={`viewer-nav-tab ${activeTab === 'coin' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('coin')}
          >
            <span>🪙 My Coin</span>
          </button>
          <button
            type="button"
            className={`viewer-nav-tab ${activeTab === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>📜 My Bets ({betHistory.length})</span>
          </button>
        </div>
      </header>

      {/* 2. Main Tab Body */}
      <main className="viewer-content-body">
        {/* ===================================================================
            TAB 1: RACE SLIP
            =================================================================== */}
        {activeTab === 'slip' && (
          <>
            {/* Twitch Extension Identity Link Prompt (Hidden for Broadcaster or linked users) */}
            {isTwitchExt && !isIdentityShared && !isBroadcaster && (
              <div className="twitch-link-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <TwitchGlitchIcon size={14} color="#a855f7" />
                  <span>Link your Twitch ID to show in chat &amp; claim bets</span>
                </div>
                <button
                  type="button"
                  className="twitch-link-btn"
                  onClick={handleRequestIdentityLink}
                >
                  Link
                </button>
              </div>
            )}

            {/* Contest Header Card */}
            <div className="viewer-contest-card">
              <div className="viewer-contest-title">{liveContest.title}</div>
              <div className="viewer-status-row">
                <span className={`viewer-badge-status status-${liveContest.status}`}>
                  {liveContest.status === 'open' && <span className="viewer-channel-dot" />}
                  {liveContest.status === 'locked' && <Lock size={11} />}
                  {liveContest.status === 'resolved' && <Trophy size={11} />}
                  <span>{liveContest.status === 'open' ? 'BETS OPEN' : liveContest.status === 'locked' ? 'RACE IN PROGRESS' : 'RESOLVED'}</span>
                </span>

                <div style={{ fontSize: '0.78rem', color: 'var(--vm-text-muted)', fontFamily: 'var(--font-family-mono, monospace)' }}>
                  Pool: <strong style={{ color: 'var(--vm-accent-gold)' }}>{liveContest.totalPool.toLocaleString()}</strong> pts
                </div>
              </div>
            </div>

            {/* Active Wager Ticket (If user has bet) */}
            {activeBet && (
              <div className={`viewer-active-wager-card ${activeBet.status === 'won' ? 'viewer-win-celebration-banner' : ''}`}>
                <div className="viewer-wager-header">
                  <span>{activeBet.status === 'won' ? '🏆 WIN TICKET' : activeBet.status === 'lost' ? '💀 CLOSED TICKET' : '⚡ YOUR ACTIVE WAGER'}</span>
                  <span>{activeBet.status === 'won' ? `PLACED #${activeBet.place}` : activeBet.status === 'lost' ? 'NO WIN' : 'PENDING'}</span>
                </div>
                <div className="viewer-wager-details">
                  <div className="viewer-wager-runner" style={{ color: activeBet.horseColor }}>
                    #{activeBet.horseNumber} {activeBet.outcomeName} ({activeBet.odds.toFixed(2)}x)
                  </div>
                  <div className="viewer-wager-payout">
                    {activeBet.status === 'won' ? (
                      <span style={{ color: '#10b981', fontWeight: 800 }}>+{activeBet.actualPayout?.toLocaleString()} pts!</span>
                    ) : (
                      <span>Win: {activeBet.potentialPayout.toLocaleString()} pts</span>
                    )}
                  </div>
                </div>

                {activeBet.status === 'pending' && (
                  <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px dashed rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--vm-text-muted)' }}>
                      Drop tokens on stream:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyChatCommand(activeBet.horseNumber, activeBet.amount)}
                      style={{
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#a855f7',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Copy size={11} />
                      <span>Copy <code>{storageService.getTwitchChatConfig().botPrefix || '!bet'} {activeBet.horseNumber} {activeBet.amount}</code> for Chat</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Entrants / Runners List */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--vm-text-muted)' }}>
                Pick a Runner to Bet:
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--vm-text-muted)', fontFamily: 'var(--font-family-mono, monospace)' }}>
                {liveContest.outcomes.length} horses
              </span>
            </div>

            <div className="viewer-runners-list">
              {(!liveContest.outcomes || liveContest.outcomes.length === 0) ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  background: 'var(--vm-card-bg)',
                  borderRadius: '12px',
                  border: '1px dashed var(--vm-card-border)',
                  margin: '0.5rem 0'
                }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🏇</div>
                  <div style={{ fontWeight: 700, color: 'var(--vm-text-primary)', fontSize: '0.95rem' }}>Waiting for Race to Open...</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--vm-text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                    The streamer will start the next contest shortly. Meanwhile, customize your 3D lucky coin in the <strong>My Coin</strong> tab!
                  </div>
                </div>
              ) : (
                liveContest.outcomes.map(outcome => {
                  const isSelected = selectedOutcomeId === outcome.id;

                  return (
                    <div
                      key={outcome.id}
                      className={`viewer-runner-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        if (liveContest.status !== 'open') {
                          showToast('Bets are currently locked!');
                          return;
                        }
                        setSelectedOutcomeId(outcome.id);
                        soundEffects.playTokenClink();
                      }}
                    >
                      <div className="viewer-runner-left">
                        <div
                          className="viewer-runner-num"
                          style={{ backgroundColor: outcome.color }}
                        >
                          {outcome.number}
                        </div>
                        <span style={{ fontSize: '1.1rem' }}>
                          <IconDisplay icon={outcome.icon} fallback="🏇" />
                        </span>
                        <span className="viewer-runner-name">{outcome.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="viewer-runner-odds">
                          {outcome.odds.toFixed(2)}x
                        </span>
                        <ChevronRight size={14} color="#64748b" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ===================================================================
            TAB 2: MY COIN STUDIO
            =================================================================== */}
        {activeTab === 'coin' && (
          <div className="viewer-coin-studio">
            <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--vm-text-primary)', fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)" }}>
                Personal 3D Coin Studio
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--vm-text-muted)' }}>
                Customized tokens appear when you drop bets on stream
              </div>
            </div>

            {/* Performant 3D/Lite Coin Preview */}
            <PerformantTokenPreview config={tokenConfig} size={170} interactive={true} />

            {/* Icon Picker Trigger */}
            <button
              type="button"
              className="cyber-btn-secondary"
              onClick={() => setIsIconPickerOpen(true)}
              style={{
                width: '100%',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '10px',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>
                <IconDisplay icon={tokenConfig.emoji} fallback="⚡" />
              </span>
              <span>Change Coin Icon / Emoji</span>
            </button>

            {/* Material & Color Presets */}
            <div style={{ width: '100%' }}>
              <span className="viewer-form-label">Material & Color Finishes</span>
              <div className="viewer-palette-grid">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    className={`viewer-color-pill ${tokenConfig.colorTint === p.color ? 'is-active' : ''}`}
                    style={{ backgroundColor: p.color }}
                    onClick={() => {
                      setTokenConfig(prev => ({
                        ...prev,
                        colorTint: p.color,
                        metalness: p.metal,
                        roughness: p.rough,
                        finish: p.finish
                      }));
                      soundEffects.playTokenClink();
                    }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Sliders for Metalness & Roughness */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--vm-text-muted)', marginBottom: '0.2rem' }}>
                  <span>Metallic Shine</span>
                  <span>{Math.round((tokenConfig.metalness ?? 0.85) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tokenConfig.metalness ?? 0.85}
                  onChange={e => setTokenConfig(prev => ({ ...prev, metalness: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#fbbf24' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--vm-text-muted)', marginBottom: '0.2rem' }}>
                  <span>Surface Gloss / Smoothness</span>
                  <span>{Math.round((1 - (tokenConfig.roughness ?? 0.2)) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tokenConfig.roughness ?? 0.2}
                  onChange={e => setTokenConfig(prev => ({ ...prev, roughness: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#fbbf24' }}
                />
              </div>
            </div>

            {/* Save Coin Button */}
            <button
              type="button"
              className="viewer-join-btn"
              onClick={() => {
                try {
                  localStorage.setItem('TokenPile_viewer_token_config', JSON.stringify(tokenConfig));
                  const effectiveUserId = isIdentityShared && twitchExtensionService.getUserId()
                    ? `twitch_${twitchExtensionService.getUserId()}`
                    : `viewer_${usernameInput.toLowerCase()}`;
                  const updateId = `vtu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                  broadcastStreamSync('VIEWER_TOKEN_UPDATED', {
                    updateId,
                    userId: effectiveUserId,
                    userName: usernameInput,
                    config: tokenConfig
                  });
                } catch { }
                soundEffects.playCashout();
                showToast('Coin design saved & synced with stream!');
                setActiveTab('slip');
              }}
            >
              Save Coin Design ✓
            </button>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MY BETS & HISTORY
            =================================================================== */}
        {activeTab === 'history' && (
          <div>
            {/* Stats Summary Grid */}
            <div className="viewer-stats-grid">
              <div className="viewer-stat-card">
                <div className="viewer-stat-val" style={{ color: historyStats.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {historyStats.netProfit >= 0 ? `+${historyStats.netProfit.toLocaleString()}` : historyStats.netProfit.toLocaleString()}
                </div>
                <div className="viewer-stat-label">Net Profit (pts)</div>
              </div>

              <div className="viewer-stat-card">
                <div className="viewer-stat-val" style={{ color: '#fbbf24' }}>
                  {historyStats.winRate}%
                </div>
                <div className="viewer-stat-label">Win Rate</div>
              </div>

              <div className="viewer-stat-card">
                <div className="viewer-stat-val">
                  {historyStats.totalWagered.toLocaleString()}
                </div>
                <div className="viewer-stat-label">Total Bet (pts)</div>
              </div>

              <div className="viewer-stat-card">
                <div className="viewer-stat-val" style={{ color: '#38bdf8' }}>
                  {historyStats.totalWon.toLocaleString()}
                </div>
                <div className="viewer-stat-label">Total Payouts</div>
              </div>
            </div>

            {/* Bet Log Items */}
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--vm-text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Recent Tickets:
            </span>

            {betHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--vm-text-muted)', fontSize: '0.85rem' }}>
                No bets placed yet. Tap on a runner to place your first bet!
              </div>
            ) : (
              betHistory.map(item => (
                <div key={item.id} className="viewer-history-item">
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: item.horseColor }}>
                      #{item.horseNumber} {item.outcomeName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--vm-text-muted)' }}>
                      Bet {item.amount.toLocaleString()} pts @ {item.odds.toFixed(2)}x
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {item.status === 'won' && (
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>
                        +{item.actualPayout?.toLocaleString()} pts
                      </span>
                    )}
                    {item.status === 'lost' && (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
                        Lost
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem' }}>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 3. Floating Bottom Wager Slip (Active when runner is selected) */}
      {activeTab === 'slip' && selectedOutcome && (
        <div className="viewer-bet-tray">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedOutcome.color }}>
              #{selectedOutcome.number} {selectedOutcome.name} ({selectedOutcome.odds.toFixed(2)}x)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontFamily: 'monospace' }}>
              Potential: <strong>{potentialReturn.toLocaleString()}</strong> pts
            </span>
          </div>

          {/* Quick Preset Chips */}
          <div className="viewer-chips-row">
            <button type="button" className="viewer-chip-btn" onClick={() => handleQuickChip(100)}>100</button>
            <button type="button" className="viewer-chip-btn" onClick={() => handleQuickChip(250)}>250</button>
            <button type="button" className="viewer-chip-btn" onClick={() => handleQuickChip(500)}>500</button>
            <button type="button" className="viewer-chip-btn" onClick={() => handleQuickChip(1000)}>1k</button>
            <button type="button" className="viewer-chip-btn" onClick={() => handleQuickChip(5000)}>5k</button>
            <button type="button" className="viewer-chip-btn" onClick={handleAllIn} style={{ color: '#ef4444' }}>Max</button>
          </div>

          {/* Amount input & Place Bet button */}
          <div className="viewer-bet-action-row">
            <input
              type="number"
              min="1"
              max={tokensBalance}
              value={wagerAmountInput}
              onChange={e => setWagerAmountInput(e.target.value)}
              className="viewer-amount-input"
            />
            <button
              type="button"
              className="viewer-place-bet-btn"
              onClick={handlePlaceBet}
              disabled={liveContest.status !== 'open'}
              title="Place bet and copy chat command to drop tokens on stream"
            >
              <Coins size={14} />
              <span>{liveContest.status === 'open' ? 'PLACE BET & COPY CHAT CMD' : 'BETS LOCKED'}</span>
            </button>
          </div>

          {/* Twitch Chat Copy Helper */}
          <div
            className="viewer-twitch-chat-pill"
            onClick={() => handleCopyChatCommand(selectedOutcome, parseInt(wagerAmountInput, 10) || 500)}
            title="Click to copy chat command"
          >
            <Copy size={12} />
            <span>Copy <code>{storageService.getTwitchChatConfig().botPrefix || '!bet'} {selectedOutcome.number} {wagerAmountInput}</code> for Twitch Chat</span>
          </div>
        </div>
      )}

      {/* Icon Picker Modal */}
      {isIconPickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setIsIconPickerOpen(false)}
        >
          <div
            style={{
              background: 'var(--vm-card-bg)',
              border: '1px solid var(--vm-card-border)',
              borderRadius: '16px',
              padding: '1.25rem',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: 'var(--vm-card-shadow)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--vm-text-primary)' }}>Choose Coin Emoji</h4>
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--vm-text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
            <IconPicker
              value={tokenConfig.emoji}
              hideCustomUploads={true}
              onChange={(icon: string) => {
                setTokenConfig(prev => ({ ...prev, emoji: icon }));
                setIsIconPickerOpen(false);
                soundEffects.playTokenClink();
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: selectedOutcome ? '120px' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--vm-card-bg-elevated, #FDFCF7)',
            color: 'var(--vm-text-primary, #5A4A28)',
            padding: '8px 18px',
            borderRadius: '999px',
            border: '1.5px solid var(--vm-border-active, #d97706)',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            zIndex: 100,
            maxWidth: '90%',
            textAlign: 'center',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
