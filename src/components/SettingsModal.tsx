import { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Layers,
  Palette,
  Terminal,
  Layout,
  ArrowLeftRight,
  Radio,
  Play,
  Square,
  Sparkles,
  Building2,
  Gift,
  Trophy,
  UserPlus,
  UserMinus,
  Monitor,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Plus,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  ShieldCheck,
  Percent
} from 'lucide-react';
import type {
  UserTokenConfig,
  ScreenLayoutConfig,
  ThemeCustomizationConfig,
  BucketConfig,
  TwitchChatConfig,
  HouseConfig,
  CelebrationHeaderConfig,
  TierConfig,
  OddsMode
} from '../types/betting';
import { twitchChatService, type TwitchConnectionStatus } from '../services/twitchChatService';
import { soundEffects } from '../services/soundEffects';
import { styleService } from '../services/styleService';
import { storageService, DEFAULT_TIER_CONFIGS } from '../services/storageService';
import { reloadTierConfigs } from '../TokenManager';
import { ThemeColorControls } from './ThemeColorControls';
import { CelebrationHeaderEditor } from './CelebrationHeaderEditor';

type SettingsTab = 'twitch' | 'house' | 'themes' | 'tiers' | 'layout' | 'physics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  silverThreshold: number;
  goldThreshold: number;
  onUpdateThresholds: (silver: number, gold: number) => void;
  thickness: number;
  onUpdateThickness: (thickness: number) => void;
  onClearArena: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: (enabled: boolean) => void;
  onOpenDefaultTokenEditor: () => void;
  defaultTokenConfig: UserTokenConfig;
  tokenTiers?: TierConfig[];
  onUpdateTokenTiers?: (tiers: TierConfig[]) => void;
  layoutConfig?: ScreenLayoutConfig;
  onUpdateLayoutConfig?: (layout: ScreenLayoutConfig) => void;
  themeConfig?: ThemeCustomizationConfig;
  onUpdateThemeConfig?: (updater: ThemeCustomizationConfig | ((prev: ThemeCustomizationConfig) => ThemeCustomizationConfig)) => void;
  bucketConfig?: BucketConfig;
  onUpdateBucketConfig?: (config: BucketConfig) => void;
  houseConfig?: HouseConfig;
  onUpdateHouseConfig?: (config: HouseConfig) => void;
  onAddDirectPot?: (amount: number) => void;
  currentTotalPool?: number;
  initialPrizePool?: number;
  celebrationHeaderConfig?: CelebrationHeaderConfig;
  onUpdateCelebrationHeaderConfig?: (config: CelebrationHeaderConfig) => void;
  activeStyle?: string;
  onUpdateActiveStyle?: (style: string) => void;
  oddsMode?: OddsMode;
  onToggleOddsMode?: (mode?: OddsMode) => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  silverThreshold,
  goldThreshold,
  onUpdateThresholds,
  thickness,
  onUpdateThickness,
  onClearArena,
  isDebugMode,
  onToggleDebugMode,
  onOpenDefaultTokenEditor,
  defaultTokenConfig,
  tokenTiers,
  onUpdateTokenTiers,
  layoutConfig,
  onUpdateLayoutConfig,
  themeConfig,
  onUpdateThemeConfig,
  bucketConfig,
  onUpdateBucketConfig,
  houseConfig,
  onUpdateHouseConfig,
  onAddDirectPot,
  currentTotalPool,
  initialPrizePool,
  celebrationHeaderConfig,
  onUpdateCelebrationHeaderConfig,
  activeStyle,
  onUpdateActiveStyle,
  oddsMode = 'auto',
  onToggleOddsMode
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('twitch');
  const [twitchConfig, setTwitchConfig] = useState<TwitchChatConfig>(() => twitchChatService.getConfig());
  const [twitchStatus, setTwitchStatus] = useState<TwitchConnectionStatus>(() => twitchChatService.getStatus());
  const [testBetSent, setTestBetSent] = useState(false);
  const [testJoinSent, setTestJoinSent] = useState(false);
  const [testLeaveSent, setTestLeaveSent] = useState(false);
  const [testLockSent, setTestLockSent] = useState(false);
  const [testOpenSent, setTestOpenSent] = useState(false);
  const [testResetSent, setTestResetSent] = useState(false);
  const [testGiveSent, setTestGiveSent] = useState(false);
  const [testOddsSent, setTestOddsSent] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [volume, setVolume] = useState(soundEffects.getVolume());
  const [tiers, setTiers] = useState<TierConfig[]>(() => tokenTiers || storageService.getTokenTiers());

  // House & GM Configuration local state
  const [houseName, setHouseName] = useState(houseConfig?.name || 'The House');
  const [houseBetAmount, setHouseBetAmount] = useState(houseConfig?.betAmount || 500);
  const [houseEmoji, setHouseEmoji] = useState(houseConfig?.emoji || '🏛️');
  const [defaultPrizePool, setDefaultPrizePool] = useState(houseConfig?.defaultPrizePool || 0);
  const [prizeInput, setPrizeInput] = useState<number>(5000);
  const [prizeAddedMsg, setPrizeAddedMsg] = useState(false);

  // OBS Studio & Stream Overlay URLs
  const [copiedKey, setCopiedKey] = useState<'overlay' | 'dock' | 'viewer' | 'panel' | null>(null);

  const getCleanChannel = () => {
    return twitchConfig.channel ? twitchChatService.cleanChannelName(twitchConfig.channel) : '';
  };

  const getDockUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/index.html`;
  };

  const getOverlayUrl = () => {
    if (typeof window === 'undefined') return '';
    const chan = getCleanChannel();
    return `${window.location.origin}/obs.html${chan ? `?channel=${chan}` : ''}`;
  };

  const getViewerUrl = () => {
    if (typeof window === 'undefined') return '';
    const chan = getCleanChannel();
    return `${window.location.origin}/viewer.html${chan ? `?channel=${chan}` : ''}`;
  };

  const getPanelExtensionUrl = () => {
    if (typeof window === 'undefined') return '';
    const chan = getCleanChannel();
    return `${window.location.origin}/panel.html${chan ? `?channel=${chan}` : ''}`;
  };

  const handleCopyObsUrl = (type: 'overlay' | 'dock' | 'viewer' | 'panel') => {
    let url = '';
    if (type === 'overlay') url = getOverlayUrl();
    else if (type === 'dock') url = getDockUrl();
    else if (type === 'viewer') url = getViewerUrl();
    else if (type === 'panel') url = getPanelExtensionUrl();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey(type);
      soundEffects.playTokenClink();
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  useEffect(() => {
    if (tokenTiers) {
      setTiers(tokenTiers);
    }
  }, [tokenTiers]);

  const handleUpdateTier = (index: number, updates: Partial<TierConfig>) => {
    setTiers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleAddTier = () => {
    const highestVal = tiers.length > 0 ? tiers[0].value : 1000;
    const newTier: TierConfig = {
      tier: `tier_${Date.now()}`,
      name: 'Custom Tier',
      value: Math.round(highestVal * 2),
      tint: '#38bdf8',
      radius2D: 24,
      scale3D: 1.35,
      metalBoost: 1.0,
      roughOverride: 0.05,
      isCustom: true,
    };
    const next = [...tiers, newTier].sort((a, b) => b.value - a.value);
    setTiers(next);
    soundEffects.playTokenClink();
  };

  const handleDeleteTier = (index: number) => {
    if (tiers[index].value === 1 || tiers[index].tier === 'base') {
      return;
    }
    const next = tiers.filter((_, i) => i !== index);
    setTiers(next);
    soundEffects.playTokenClink();
  };

  const handleResetTiers = () => {
    const reset = storageService.resetTokenTiers();
    reloadTierConfigs(reset);
    setTiers(reset);
    onUpdateTokenTiers?.(reset);
    soundEffects.playTokenClink();
  };

  const applyTierPreset = (type: 'millionaire' | 'arcade' | 'whale') => {
    let presetTiers: TierConfig[] = [];
    if (type === 'millionaire') {
      presetTiers = [...DEFAULT_TIER_CONFIGS];
    } else if (type === 'arcade') {
      presetTiers = [
        { tier: 'colossal', name: 'Colossal', value: 25000, tint: '#ef4444', radius2D: 30, scale3D: 1.80, metalBoost: 1.0, roughOverride: 0.02 },
        { tier: 'legendary', name: 'Legendary', value: 10000, tint: '#f59e0b', radius2D: 26, scale3D: 1.50, metalBoost: 1.0, roughOverride: 0.04 },
        { tier: 'mythic', name: 'Mythic', value: 5000, tint: '#a855f7', radius2D: 22, scale3D: 1.30, metalBoost: 1.0, roughOverride: 0.06 },
        { tier: 'platinum', name: 'Platinum', value: 1000, tint: '#06b6d4', radius2D: 19, scale3D: 1.15, metalBoost: 1.0, roughOverride: 0.08 },
        { tier: 'gold', name: 'Gold', value: 500, tint: '#fbbf24', radius2D: 17, scale3D: 1.05, metalBoost: 0.95, roughOverride: 0.12 },
        { tier: 'silver', name: 'Silver', value: 100, tint: '#cbd5e1', radius2D: 14, scale3D: 0.95, metalBoost: 0.85, roughOverride: 0.20 },
        { tier: 'base', name: 'Base', value: 1, tint: '#94a3b8', radius2D: 12, scale3D: 0.85, metalBoost: 0.0, roughOverride: null },
      ];
    } else if (type === 'whale') {
      presetTiers = [
        { tier: 'titan', name: 'Titan', value: 10000000, tint: '#ec4899', radius2D: 40, scale3D: 2.60, metalBoost: 1.0, roughOverride: 0.01 },
        { tier: 'colossal', name: 'Colossal', value: 1000000, tint: '#ef4444', radius2D: 34, scale3D: 2.20, metalBoost: 1.0, roughOverride: 0.02 },
        { tier: 'legendary', name: 'Legendary', value: 100000, tint: '#f59e0b', radius2D: 28, scale3D: 1.70, metalBoost: 1.0, roughOverride: 0.04 },
        { tier: 'mythic', name: 'Mythic', value: 25000, tint: '#a855f7', radius2D: 24, scale3D: 1.45, metalBoost: 1.0, roughOverride: 0.06 },
        { tier: 'platinum', name: 'Platinum', value: 5000, tint: '#06b6d4', radius2D: 20, scale3D: 1.25, metalBoost: 1.0, roughOverride: 0.08 },
        { tier: 'gold', name: 'Gold', value: 500, tint: '#fbbf24', radius2D: 17, scale3D: 1.10, metalBoost: 0.95, roughOverride: 0.12 },
        { tier: 'silver', name: 'Silver', value: 100, tint: '#cbd5e1', radius2D: 14, scale3D: 0.95, metalBoost: 0.85, roughOverride: 0.20 },
        { tier: 'base', name: 'Base', value: 1, tint: '#94a3b8', radius2D: 12, scale3D: 0.85, metalBoost: 0.0, roughOverride: null },
      ];
    }
    const saved = storageService.saveTokenTiers(presetTiers);
    reloadTierConfigs(saved);
    setTiers(saved);
    onUpdateTokenTiers?.(saved);
    soundEffects.playTokenClink();
  };

  useEffect(() => {
    if (houseConfig) {
      setHouseName(houseConfig.name || 'The House');
      setHouseBetAmount(houseConfig.betAmount || 500);
      setHouseEmoji(houseConfig.emoji || '🏛️');
      setDefaultPrizePool(houseConfig.defaultPrizePool || 0);
    }
  }, [houseConfig]);

  useEffect(() => {
    return twitchChatService.onStatusChange((status) => {
      setTwitchStatus(status);
    });
  }, []);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    twitchChatService.saveConfig(twitchConfig);
    onUpdateHouseConfig?.({
      name: houseName.trim() || 'The House',
      betAmount: Math.max(1, houseBetAmount),
      emoji: houseEmoji || '🏛️',
      defaultPrizePool: Math.max(0, defaultPrizePool)
    });
    const sorted = [...tiers].sort((a, b) => b.value - a.value);
    const saved = storageService.saveTokenTiers(sorted);
    reloadTierConfigs(saved);
    onUpdateTokenTiers?.(saved);
    soundEffects.playCashout();
    onClose();
  };

  const handleAddPrize = (amt: number) => {
    if (amt <= 0) return;
    onAddDirectPot?.(amt);
    setPrizeAddedMsg(true);
    setTimeout(() => setPrizeAddedMsg(false), 2500);
  };

  const handleToggleTwitchConnect = () => {
    twitchChatService.saveConfig(twitchConfig);
    if (twitchStatus === 'connected' || twitchStatus === 'connecting') {
      twitchChatService.disconnect();
    } else {
      twitchChatService.connect();
    }
  };

  const handleSendTestBet = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingBet('1', 500, 'TwitchTester', 'TwitchTester');
    setTestBetSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestBetSent(false), 3000);
  };

  const handleSendTestJoin = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingJoin('TwitchTester', 'TwitchTester', '#06b6d4');
    setTestJoinSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestJoinSent(false), 3000);
  };

  const handleSendTestLeave = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingLeave('TwitchTester', 'TwitchTester');
    setTestLeaveSent(true);
    soundEffects.playCashout();
    setTimeout(() => setTestLeaveSent(false), 3000);
  };

  const handleSendTestLock = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingAdmin('lock');
    setTestLockSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestLockSent(false), 3000);
  };

  const handleSendTestOpen = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingAdmin('open');
    setTestOpenSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestOpenSent(false), 3000);
  };

  const handleSendTestReset = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingAdmin('reset');
    setTestResetSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestResetSent(false), 3000);
  };

  const handleSendTestGive = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingAdmin('give', 'TwitchTester', 1000);
    setTestGiveSent(true);
    soundEffects.playCashout();
    setTimeout(() => setTestGiveSent(false), 3000);
  };

  const handleSendTestOdds = () => {
    twitchChatService.saveConfig(twitchConfig);
    twitchChatService.simulateIncomingAdmin('odds', undefined, undefined, '1', 3.5);
    setTestOddsSent(true);
    soundEffects.playTokenClink();
    setTimeout(() => setTestOddsSent(false), 3000);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEffects.setMuted(next);
    if (!next) soundEffects.playTokenClink();
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    soundEffects.setVolume(vol);
  };

  return (
    <div className="modal-backdrop">
      <div className="settings-modal cosmos-panel">
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="header-icon-badge">
              <Settings size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                System &amp; Twitch Settings
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)' }}>
                Configure live Twitch chat listener, default viewer tokens, theme, layout, and physics
              </p>
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Top Category Navigation Tabs */}
        <div className="settings-modal-tabs-bar">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'twitch' ? 'active' : ''}`}
            onClick={() => setActiveTab('twitch')}
          >
            <Radio size={14} />
            <span>Twitch &amp; OBS</span>
            {twitchStatus === 'connected' && <span className="settings-tab-badge badge-live">Live</span>}
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'house' ? 'active' : ''}`}
            onClick={() => setActiveTab('house')}
          >
            <Building2 size={14} />
            <span>House &amp; Prize Pot</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            <Palette size={14} />
            <span>Themes &amp; Skins</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'tiers' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiers')}
          >
            <Coins size={14} />
            <span>Token Tiers</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            <Layout size={14} />
            <span>Layout &amp; Audio</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
            onClick={() => setActiveTab('physics')}
          >
            <Layers size={14} />
            <span>Physics &amp; Debug</span>
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="settings-modal-body">
          {/* =========================================================================
              TAB 1: TWITCH LIVE CHAT & OBS STREAM OVERLAY
              ========================================================================= */}
          {activeTab === 'twitch' && (
            <>
              {/* Direct Twitch Live Chat Integration */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Radio size={16} color="#a855f7" />
                  <h3>Direct Twitch Live Chat Integration</h3>
                </div>

                <div className="sim-mode-toggle-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.9rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                        Direct Twitch IRC Listener
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        Listens directly to your Twitch channel chat. Viewers can bet on any number of entrants using in-app tokens.
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: twitchStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : twitchStatus === 'connecting' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: twitchStatus === 'connected' ? '#16a34a' : twitchStatus === 'connecting' ? '#d97706' : '#64748b',
                          border: `1px solid ${twitchStatus === 'connected' ? 'rgba(34, 197, 94, 0.3)' : twitchStatus === 'connecting' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(100, 116, 139, 0.25)'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: twitchStatus === 'connected' ? '#22c55e' : twitchStatus === 'connecting' ? '#eab308' : '#94a3b8',
                            boxShadow: twitchStatus === 'connected' ? '0 0 6px #22c55e' : 'none',
                          }}
                        />
                        <span>
                          {twitchStatus === 'connected'
                            ? `Connected to #${twitchChatService.cleanChannelName(twitchConfig.channel)}`
                            : twitchStatus === 'connecting'
                              ? 'Connecting...'
                              : twitchStatus === 'error'
                                ? 'Connection Error'
                                : 'Disconnected'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={twitchStatus === 'connected' ? 'cyber-btn-danger' : 'cyber-btn-primary mini-btn'}
                        onClick={handleToggleTwitchConnect}
                        disabled={!twitchConfig.channel.trim() || twitchStatus === 'connecting'}
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                      >
                        {twitchStatus === 'connected' ? <><Square size={11} /> Disconnect</> : <><Play size={11} /> Connect</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '0.4rem' }}>
                  <div>
                    <label className="section-label">Twitch Channel Username</label>
                    <input
                      type="text"
                      placeholder="e.g. your_channel_name"
                      value={twitchConfig.channel}
                      onChange={e => setTwitchConfig(prev => ({ ...prev, channel: e.target.value }))}
                      className="cyber-input"
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #8E7D53)', marginTop: '0.2rem' }}>
                      Anonymous read-only connection — no Twitch password or OAuth token required!
                    </div>
                  </div>

                  <div>
                    <label className="section-label">Starting Tokens for New Viewers</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={twitchConfig.startingTokens}
                      onChange={e => setTwitchConfig(prev => ({ ...prev, startingTokens: parseInt(e.target.value, 10) || 50000 }))}
                      className="cyber-input"
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #8E7D53)', marginTop: '0.2rem' }}>
                      Initial points given when a new chatter joins or places their first bet.
                    </div>
                  </div>
                </div>

                {/* OBS Stream Overlay Mirroring Card */}
                <div
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.8rem 0.95rem',
                    background: 'rgba(56, 189, 248, 0.07)',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    borderRadius: 'var(--app-radius-sm, 10px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Monitor size={15} color="#38bdf8" />
                      <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.84rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                        OBS Browser Source (100% Transparent Live Mirror)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="cyber-btn-ghost mini-btn"
                      onClick={() => handleCopyObsUrl('overlay')}
                      style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
                    >
                      {copiedKey === 'overlay' ? <><Check size={12} color="#16a34a" /> Copied!</> : <><Copy size={12} /> Copy OBS URL</>}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)', marginBottom: '0.4rem' }}>
                    Add as a Browser Source in OBS (<strong>1920&times;1080</strong>). It automatically mirrors this dashboard on stream with zero background!
                  </div>
                  <code className="obs-url-code" style={{ display: 'block', fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}>
                    {getOverlayUrl()}
                  </code>
                </div>

                {/* Editable Chat Commands */}
                <div style={{ marginTop: '0.8rem', borderTop: '1px dashed var(--well-border, rgba(125, 107, 66, 0.22))', paddingTop: '0.8rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)', marginBottom: '0.6rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                    Custom Chat Commands
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* 1. Bet Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Bet Command</label>
                        <input
                          type="text"
                          value={twitchConfig.botPrefix || '!bet'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, botPrefix: e.target.value }))}
                          className="cyber-input"
                          placeholder="!bet"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.botPrefix || '!bet'} &lt;entrant # or name&gt; &lt;amount or &quot;all&quot;&gt;</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>e.g. <code>{twitchConfig.botPrefix || '!bet'} 14 500</code>, <code>{twitchConfig.botPrefix || '!bet'} 14 5k</code>, <code>{twitchConfig.botPrefix || '!bet'} Thunderbolt all</code></div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestBet}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Sparkles size={12} color="#f59e0b" />
                          <span>{testBetSent ? '✓ Sent Bet!' : 'Test Bet'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Join Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Join Command</label>
                        <input
                          type="text"
                          value={twitchConfig.joinCommand ?? '!join'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, joinCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!join"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.joinCommand || '!join'}</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Lets viewers appear in the sidebar roster immediately with starting tokens without placing a bet first.</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestJoin}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <UserPlus size={12} color="#06b6d4" />
                          <span>{testJoinSent ? '✓ Joined!' : 'Test Join'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Leave Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Leave Command</label>
                        <input
                          type="text"
                          value={twitchConfig.leaveCommand ?? '!leave'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, leaveCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!leave"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.leaveCommand || '!leave'}</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Allows viewers to remove themselves from the active sidebar roster.</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestLeave}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <UserMinus size={12} color="#94a3b8" />
                          <span>{testLeaveSent ? '✓ Left!' : 'Test Leave'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Broadcaster & Moderator Commands */}
                <div style={{ marginTop: '0.9rem', borderTop: '1px dashed var(--well-border, rgba(125, 107, 66, 0.22))', paddingTop: '0.8rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)', marginBottom: '0.6rem', fontFamily: "'Merge One', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={14} color="#10b981" />
                    <span>Broadcaster &amp; Moderator Commands</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted, #8E7D53)' }}>(Requires Broadcaster or Mod badge)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* 1. Lock Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Lock Bets</label>
                        <input
                          type="text"
                          value={twitchConfig.lockCommand ?? '!lock'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, lockCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!lock"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.lockCommand || '!lock'}</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Locks betting before a race starts so no more bets can enter.</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestLock}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Lock size={12} color="#f59e0b" />
                          <span>{testLockSent ? '✓ Locked!' : 'Test Lock'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Open Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Open Bets</label>
                        <input
                          type="text"
                          value={twitchConfig.openCommand ?? '!open'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, openCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!open"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.openCommand || '!open'}</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Reopens betting for the active race.</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestOpen}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Unlock size={12} color="#10b981" />
                          <span>{testOpenSent ? '✓ Opened!' : 'Test Open'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Reset Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Reset Race</label>
                        <input
                          type="text"
                          value={twitchConfig.resetCommand ?? '!reset'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, resetCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!reset"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.resetCommand || '!reset'}</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Resets race pools, clears bets, and files entrants back into starting positions.</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestReset}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <RotateCcw size={12} color="#ec4899" />
                          <span>{testResetSent ? '✓ Reset!' : 'Test Reset'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. Give Points Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Give Points</label>
                        <input
                          type="text"
                          value={twitchConfig.giveCommand ?? '!give'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, giveCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!give"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.giveCommand || '!give'} &lt;@viewer&gt; &lt;amount&gt;</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Awards virtual points directly to a viewer (e.g. <code>{twitchConfig.giveCommand || '!give'} @viewer 1000</code>).</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestGive}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Coins size={12} color="#eab308" />
                          <span>{testGiveSent ? '✓ Given!' : 'Test Give'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 5. Set Odds Command */}
                    <div className="twitch-command-card">
                      <div style={{ width: '130px', flexShrink: 0 }}>
                        <label className="section-label" style={{ marginBottom: '0.2rem' }}>Set Odds</label>
                        <input
                          type="text"
                          value={twitchConfig.oddsCommand ?? '!odds'}
                          onChange={e => setTwitchConfig(prev => ({ ...prev, oddsCommand: e.target.value }))}
                          className="cyber-input"
                          placeholder="!odds"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        <div>Usage: <code>{twitchConfig.oddsCommand || '!odds'} &lt;entrant # or name&gt; &lt;multiplier&gt;</code></div>
                        <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Sets manual multiplier odds for an entrant (e.g. <code>{twitchConfig.oddsCommand || '!odds'} 1 2.5</code>).</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cyber-btn-secondary mini-btn"
                          onClick={handleSendTestOdds}
                          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Percent size={12} color="#6366f1" />
                          <span>{testOddsSent ? '✓ Set Odds!' : 'Test Odds'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="switch" style={{ transform: 'scale(0.85)' }}>
                    <input
                      type="checkbox"
                      checked={twitchConfig.autoConnect}
                      onChange={e => setTwitchConfig(prev => ({ ...prev, autoConnect: e.target.checked }))}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary, #5A4A28)' }}>
                    Auto-connect to Twitch chat when TokenPile opens
                  </span>
                </div>
              </div>

              {/* OBS Studio & Broadcast Overlay Section */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Monitor size={16} color="#0284c7" />
                  <h3>OBS Studio &amp; Broadcast Overlay (Zero-Server Sync)</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="obs-guide-box">
                    <strong>💡 How to capture in OBS with a transparent background &amp; sync seamlessly:</strong>
                    <ol style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <li>In OBS Studio, open top menu: <strong>Docks &rarr; Custom Browser Docks...</strong></li>
                      <li>Paste the <strong>Admin Controller URL</strong> as a dock to control races and bets directly inside OBS.</li>
                      <li>In your OBS Scene, add a <strong>Browser Source</strong> (1920&times;1080) using the <strong>Transparent Overlay URL</strong>.</li>
                      <li>Both run inside OBS's built-in session—syncing with <strong>0ms latency and 0 external servers required</strong>!</li>
                    </ol>
                  </div>

                  {/* URL 1: Transparent Overlay URL (for OBS Scene) */}
                  <div className="obs-url-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #5A4A28)' }}>
                        🎬 Transparent Overlay URL <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Add to OBS Scene Browser Source)</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => handleCopyObsUrl('overlay')}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                        >
                          {copiedKey === 'overlay' ? <><Check size={12} color="#16a34a" /> Copied!</> : <><Copy size={12} /> Copy Overlay URL</>}
                        </button>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => window.open(getOverlayUrl(), '_blank')}
                          title="Preview transparent overlay in new tab"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                    <code className="obs-url-code">
                      {getOverlayUrl()}
                    </code>
                  </div>

                  {/* URL 2: Admin Controller URL (for OBS Custom Dock) */}
                  <div className="obs-url-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #5A4A28)' }}>
                        🎛️ Admin Controller URL <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Add to OBS Docks &rarr; Custom Browser Docks)</span>
                      </span>
                      <button
                        type="button"
                        className="cyber-btn-ghost mini-btn"
                        onClick={() => handleCopyObsUrl('dock')}
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                      >
                        {copiedKey === 'dock' ? <><Check size={12} color="#16a34a" /> Copied!</> : <><Copy size={12} /> Copy Dock URL</>}
                      </button>
                    </div>
                    <code className="obs-url-code">
                      {getDockUrl()}
                    </code>
                  </div>

                  {/* URL 3: Mobile & Web Viewer Bet Slip */}
                  <div className="obs-url-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #5A4A28)' }}>
                        📱 Mobile &amp; Viewer Bet Slip URL <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Share with viewers in chat or stream bio)</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => handleCopyObsUrl('viewer')}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                        >
                          {copiedKey === 'viewer' ? <><Check size={12} color="#16a34a" /> Copied!</> : <><Copy size={12} /> Copy Viewer URL</>}
                        </button>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => window.open(getViewerUrl(), '_blank')}
                          title="Preview mobile view in new tab"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                    <code className="obs-url-code">
                      {getViewerUrl()}
                    </code>
                  </div>

                  {/* URL 4: Twitch Panel Extension URL */}
                  <div className="obs-url-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #5A4A28)' }}>
                        👾 Twitch Panel Extension URL <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Twitch Developer Console &rarr; Panel View: 318px)</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => handleCopyObsUrl('panel')}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                        >
                          {copiedKey === 'panel' ? <><Check size={12} color="#16a34a" /> Copied!</> : <><Copy size={12} /> Copy Panel URL</>}
                        </button>
                        <button
                          type="button"
                          className="cyber-btn-ghost mini-btn"
                          onClick={() => window.open(getPanelExtensionUrl(), '_blank')}
                          title="Preview Twitch panel extension view in new tab"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                    <code className="obs-url-code">
                      {getPanelExtensionUrl()}
                    </code>
                  </div>

                  {/* Twitch Extension PubSub Info Banner */}
                  <div style={{
                    marginTop: '0.8rem',
                    background: 'rgba(145, 71, 255, 0.08)',
                    border: '1px solid rgba(145, 71, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.9rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #6B5B37)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#9146ff', marginBottom: '0.25rem' }}>
                      <Radio size={14} />
                      <span>Twitch Extension PubSub Active (Zero Hosting Cost &amp; No Limits)</span>
                    </div>
                    <div>
                      Contest state, runner odds, and pool changes are broadcast to all viewer panels in real time via Twitch&apos;s free built-in PubSub network. Viewers can link their Twitch account with 1 click to authenticate securely.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              TAB 2: HOUSE & PRIZE POOL (STREAMER / GM CONTROLS)
              ========================================================================= */}
          {activeTab === 'house' && (
            <div className="settings-section">
              <div className="section-title-row">
                <Building2 size={16} color="#d97706" />
                <h3>House &amp; Prize Pool (Streamer / GM Controls)</h3>
              </div>

              <div className="house-settings-card">
                {/* Row 1: House Name & Emoji & Quick Bet Amount */}
                <div className="house-settings-grid">
                  <div className="house-field-item">
                    <label className="house-field-label">House Name (Streamer / GM)</label>
                    <input
                      type="text"
                      className="cyber-input"
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="The House"
                    />
                    <span className="house-field-hint">Name attributed to streamer bets placed via the odds bar</span>
                  </div>

                  <div className="house-field-item">
                    <label className="house-field-label">House Token Emoji</label>
                    <input
                      type="text"
                      className="cyber-input"
                      value={houseEmoji}
                      onChange={(e) => setHouseEmoji(e.target.value)}
                      placeholder="🏛️"
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                    <span className="house-field-hint">Emoji stamped on physical house tokens dropped into the bucket</span>
                  </div>

                  <div className="house-field-item" style={{ gridColumn: 'span 2' }}>
                    <label className="house-field-label">House Quick Bet Amount</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min={10}
                        step={50}
                        className="cyber-input"
                        value={houseBetAmount}
                        onChange={(e) => setHouseBetAmount(Number(e.target.value))}
                        style={{ width: '110px' }}
                      />
                      <div className="house-quick-presets">
                        {[100, 200, 500, 1000, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            className={`preset-chip ${houseBetAmount === amt ? 'is-active' : ''}`}
                            onClick={() => setHouseBetAmount(amt)}
                          >
                            {amt >= 1000 ? `${amt / 1000}k` : amt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="house-field-hint">Points bet on a horse when clicking its chip in the odds bar</span>
                  </div>
                </div>

                {/* Row 2: Add Points Directly to Pot (Prize Pool) */}
                <div className="house-pot-section">
                  <div className="house-pot-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Gift size={15} color="#f59e0b" />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.85rem' }}>
                        Add Points Directly to Overall Pot (Prize Pool)
                      </span>
                    </div>
                    {initialPrizePool && initialPrizePool > 0 ? (
                      <span className="pot-seeded-tag">
                        🎁 Seeded Pot: {initialPrizePool.toLocaleString()} pts (Total: {currentTotalPool?.toLocaleString()} pts)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                        Total Pot: {currentTotalPool?.toLocaleString() || 0} pts
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #8E7D53)', marginBottom: '8px' }}>
                    Injects points straight into the pot to guarantee a prize pool ahead of time. All horse odds immediately scale up to reflect the boosted pool!
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={100}
                      step={500}
                      className="cyber-input"
                      value={prizeInput}
                      onChange={(e) => setPrizeInput(Number(e.target.value))}
                      style={{ width: '120px' }}
                    />
                    <button
                      type="button"
                      className="cyber-btn-primary"
                      onClick={() => handleAddPrize(prizeInput)}
                      disabled={prizeInput <= 0}
                    >
                      <Trophy size={13} /> + Add to Pot
                    </button>
                    <div className="house-quick-presets">
                      {[500, 1000, 5000, 10000, 50000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className="preset-chip"
                          onClick={() => handleAddPrize(amt)}
                        >
                          +{amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                    {prizeAddedMsg && (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                        ✓ Points added to pot!
                      </span>
                    )}
                  </div>

                  {/* Default prize pool for future races */}
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--well-border, rgba(125,107,66,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary, #5A4A28)' }}>Default Starting Prize Pool</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #8E7D53)' }}>Every new or reset race will automatically start with this seeded pot</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        className="cyber-input"
                        value={defaultPrizePool}
                        onChange={(e) => setDefaultPrizePool(Math.max(0, Number(e.target.value)))}
                        style={{ width: '100px' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>pts</span>
                    </div>
                  </div>

                  {/* Row 3: Contest Odds Calculation Mode (Auto Pool vs Fixed Manual) */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--well-border, rgba(125,107,66,0.2))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #5A4A28)' }}>
                          Contest Odds Calculation Mode
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                          Choose whether odds dynamically shift with betting pool volume or remain fixed at entrant values
                        </div>
                      </div>

                      {onToggleOddsMode && (
                        <div className="segmented-button-group" style={{ margin: 0 }}>
                          <button
                            type="button"
                            className={`segment-btn ${oddsMode !== 'manual' ? 'active-amber' : ''}`}
                            onClick={() => onToggleOddsMode('auto')}
                          >
                            ⚡ Auto (Pari-Mutuel Pool)
                          </button>
                          <button
                            type="button"
                            className={`segment-btn ${oddsMode === 'manual' ? 'active-amber' : ''}`}
                            onClick={() => onToggleOddsMode('manual')}
                          >
                            🎯 Fixed (Manual Streamer Odds)
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--well-bg, rgba(217, 217, 217, 0.42))',
                      border: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted, #8E7D53)',
                      lineHeight: 1.4
                    }}>
                      {oddsMode === 'manual' ? (
                        <div>
                          🎯 <strong>Fixed / Manual Odds Active:</strong> Entrant odds multipliers (e.g. 2.0x, 3.5x, 5.0x) are strictly locked. Payouts for winners are calculated directly from entrant odds multipliers without pool dilution.
                        </div>
                      ) : (
                        <div>
                          ⚡ <strong>Auto / Pari-Mutuel Pool Active:</strong> Odds multipliers dynamically adjust in real time as viewers drop tokens on different entrants. Entrant starting odds act as initial morning-line prior to bets.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: VISUAL THEMES, SKINS, TOKENS & BANNER
              ========================================================================= */}
          {activeTab === 'themes' && (
            <>
              {/* Visual Skin Theme Package */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Sparkles size={16} color="#d97706" />
                  <h3>Visual Skin Theme Package</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--card-bg-elevated, #FDFCF7)',
                    border: '1px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.88rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                        Active Skin Theme: <span style={{ color: 'var(--accent-gold, #d97706)' }}>{styleService.getStyleDisplayName(activeStyle || 'default')}</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #8E7D53)', marginTop: '2px' }}>
                        Select a skin package loaded from the <code>src/styles/</code> directory.
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        className="cyber-input"
                        value={activeStyle || 'default'}
                        onChange={(e) => onUpdateActiveStyle?.(e.target.value)}
                        style={{
                          fontFamily: "'Merge One', system-ui, sans-serif",
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '0.4rem 0.8rem',
                          minWidth: '160px',
                          cursor: 'pointer'
                        }}
                      >
                        {styleService.getAvailableStyles().map((style) => (
                          <option key={style} value={style}>
                            {styleService.getStyleDisplayName(style)} {style === 'default' ? '(Baseline Default)' : '(Custom Skin)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--well-bg, rgba(217, 217, 217, 0.35))',
                    border: '1px dashed var(--well-border, rgba(125, 107, 66, 0.25))',
                    borderRadius: '6px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted, #8E7D53)',
                    lineHeight: 1.45
                  }}>
                    <strong>💡 How to create custom skins:</strong> Duplicate the <code>src/styles/Default/</code> folder to a new name (e.g. <code>src/styles/Scifi/</code>). You can customize tokens (colors, fonts), card CSS, or replace any images in <code>Images/</code>. Any missing CSS files or images will automatically fall back to the Default theme.
                  </div>
                </div>
              </div>

              {/* Default App Token for Joining Users */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Palette size={16} color="#9333ea" />
                  <h3>Default Channel Token for Joining Viewers</h3>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg-elevated, #FDFCF7)', border: '1px solid var(--well-border, rgba(125, 107, 66, 0.22))', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      fontSize: '1.8rem',
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
                      border: '1px solid var(--well-border, rgba(125, 107, 66, 0.25))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {defaultTokenConfig.emoji}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.85rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>Channel Default Token</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                        All new viewers joining chat or placing bets automatically receive this 3D/2D token design.
                      </div>
                    </div>
                  </div>

                  <button
                    className="cyber-btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenDefaultTokenEditor();
                    }}
                  >
                    <Palette size={13} /> Customize Design
                  </button>
                </div>
              </div>

              {/* App Colors & Theme Customization */}
              {themeConfig && onUpdateThemeConfig && (
                <div className="settings-section">
                  <ThemeColorControls
                    themeConfig={themeConfig}
                    onChangeThemeConfig={onUpdateThemeConfig}
                  />
                </div>
              )}

              {/* Victory & Celebration Header Customization */}
              {celebrationHeaderConfig && onUpdateCelebrationHeaderConfig && (
                <div className="settings-section">
                  <div className="section-title-row">
                    <Trophy size={16} color="#fbbf24" />
                    <h3>Victory Header &amp; Banner Customization</h3>
                  </div>
                  <CelebrationHeaderEditor
                    config={celebrationHeaderConfig}
                    onChange={onUpdateCelebrationHeaderConfig}
                    compact={false}
                  />
                </div>
              )}
            </>
          )}

          {/* =========================================================================
              TAB 4: CUSTOM TOKEN TIERS & PRESTIGE DENOMINATIONS
              ========================================================================= */}
          {activeTab === 'tiers' && (
            <>
              <div className="settings-section">
                <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Coins size={18} color="#fbbf24" />
                    <div>
                      <h3 style={{ margin: 0 }}>Custom Token Tiers &amp; Thresholds</h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                        Configure custom denominations, 2D circle radii, 3D coin scales, and metallic colors. Supports amounts up to 1,000,000+ Colossal.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="cyber-btn-ghost mini-btn"
                      onClick={handleAddTier}
                      title="Create a new custom token tier denomination"
                      style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Plus size={11} />
                      <span>Add New Tier</span>
                    </button>
                    <button
                      type="button"
                      className="cyber-btn-ghost mini-btn"
                      onClick={handleResetTiers}
                      title="Restore default tier limits (1M Colossal down to 1 Base)"
                      style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RotateCcw size={11} />
                      <span>Reset Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Quick Denomination Presets Bar */}
                <div className="calibration-presets-section" style={{ margin: '0.6rem 0 0.8rem 0' }}>
                  <span className="calibration-presets-label" style={{ fontSize: '0.72rem' }}>Preset Schemes:</span>
                  <div className="calibration-presets-buttons">
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyTierPreset('millionaire')}
                      title="Colossal 1,000,000 | Legendary 100,000 | Mythic 25,000 | Platinum 5,000 | Gold 500 | Silver 100"
                    >
                      🌟 Millionaire (1M Colossal)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyTierPreset('arcade')}
                      title="Colossal 25,000 | Legendary 10,000 | Mythic 5,000 | Platinum 1,000 | Gold 500 | Silver 100"
                    >
                      🎮 Classic Arcade (25k Colossal)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyTierPreset('whale')}
                      title="Titan 10,000,000 | Colossal 1,000,000 | Legendary 100,000 | Mythic 25,000"
                    >
                      🐋 Whale Scale (10M Titan)
                    </button>
                  </div>
                </div>

                {/* Tiers List */}
                <div className="token-tiers-editor-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {tiers.map((tier, index) => {
                    const isBase = tier.value === 1 || tier.tier === 'base';
                    const formattedDisplay = tier.value >= 1000000
                      ? `${(tier.value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
                      : tier.value >= 1000
                        ? `${(tier.value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
                        : `${tier.value}`;

                    return (
                      <div
                        key={tier.tier + index}
                        className="token-tier-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.55rem 0.75rem',
                          background: 'var(--card-bg, #F1F0E4)',
                          border: '1px solid var(--well-border, rgba(125, 107, 66, 0.25))',
                          borderRadius: '8px',
                          position: 'relative',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Coin Preview Visual */}
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(22, Math.min(42, tier.radius2D * 1.15))}px`,
                              height: `${Math.max(22, Math.min(42, tier.radius2D * 1.15))}px`,
                              borderRadius: '50%',
                              backgroundColor: tier.tint,
                              border: '2px solid rgba(255, 255, 255, 0.55)',
                              boxShadow: `0 0 10px ${tier.tint}66, inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              color: '#ffffff',
                              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                              transition: 'all 0.15s ease'
                            }}
                            title={`${tier.name} (${tier.value.toLocaleString()} pts, Radius: ${tier.radius2D}px, Scale: ${tier.scale3D}x)`}
                          >
                            🪙
                          </div>
                        </div>

                        {/* Name & Threshold */}
                        <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => handleUpdateTier(index, { name: e.target.value })}
                              className="cyber-input-mini"
                              style={{ fontWeight: 700, fontSize: '0.82rem', width: '120px' }}
                              placeholder="Tier Name"
                            />
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--well-bg, rgba(0,0,0,0.06))',
                                color: 'var(--text-muted, #8E7D53)',
                                fontFamily: 'monospace'
                              }}
                            >
                              {formattedDisplay} pts
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #8E7D53)' }}>Threshold:</span>
                            <input
                              type="number"
                              min="1"
                              disabled={isBase}
                              value={tier.value}
                              onChange={(e) => handleUpdateTier(index, { value: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="cyber-input-mini"
                              style={{ width: '100px', fontSize: '0.78rem', fontFamily: 'monospace' }}
                            />
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)' }}>pts</span>
                          </div>
                        </div>

                        {/* Color & Tint */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)' }}>Color</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input
                              type="color"
                              value={tier.tint}
                              onChange={(e) => handleUpdateTier(index, { tint: e.target.value })}
                              className="native-color-picker"
                              style={{ width: '24px', height: '24px', cursor: 'pointer', padding: 0 }}
                            />
                            <span style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>{tier.tint.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* 2D Radius Slider */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', width: '110px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)' }}>
                            <span>2D Size</span>
                            <span className="mono-val">{tier.radius2D}px</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="45"
                            step="1"
                            value={tier.radius2D}
                            onChange={(e) => handleUpdateTier(index, { radius2D: parseInt(e.target.value, 10) })}
                            className="cyber-range"
                            title="2D physics circle radius in pixels"
                          />
                        </div>

                        {/* 3D Scale Slider */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', width: '110px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)' }}>
                            <span>3D Scale</span>
                            <span className="mono-val">{tier.scale3D.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.75"
                            max="2.8"
                            step="0.05"
                            value={tier.scale3D}
                            onChange={(e) => handleUpdateTier(index, { scale3D: parseFloat(e.target.value) })}
                            className="cyber-range"
                            title="3D coin geometry scale multiplier"
                          />
                        </div>

                        {/* Delete Button */}
                        <div style={{ flexShrink: 0 }}>
                          {!isBase ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteTier(index)}
                              className="icon-btn-ghost"
                              style={{ color: '#ef4444', padding: '0.35rem' }}
                              title={`Delete ${tier.name} tier`}
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span
                              style={{ fontSize: '0.65rem', color: 'var(--text-muted, #8E7D53)', padding: '0 4px', fontStyle: 'italic' }}
                              title="Base 1pt coin is the foundation denomination and cannot be deleted"
                            >
                              (Base)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              TAB 5: SCREEN LAYOUT & AUDIO SETTINGS
              ========================================================================= */}
          {activeTab === 'layout' && (
            <>
              {/* Screen Layout & Overlay Customization */}
              {layoutConfig && onUpdateLayoutConfig && (
                <div className="settings-section">
                  <div className="section-title-row">
                    <Layout size={16} color="#0284c7" />
                    <h3>Screen Layout &amp; Overlay Customization</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Column Arrangement */}
                    <div className="sim-mode-toggle-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.88rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                            Column Arrangement: {layoutConfig.columnArrangement === 'default' ? 'Standard (Viewers Left | Stage Center | Horses Right)' : 'Inverted (Horses Left | Stage Center | Viewers Right)'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #8E7D53)' }}>
                            Swap left and right sidebars to match your Twitch chat &amp; webcam arrangement.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="cyber-btn-secondary"
                          onClick={() => onUpdateLayoutConfig({
                            ...layoutConfig,
                            columnArrangement: layoutConfig.columnArrangement === 'default' ? 'swapped' : 'default'
                          })}
                        >
                          <ArrowLeftRight size={13} /> {layoutConfig.columnArrangement === 'default' ? 'Swap Sides' : 'Reset to Default'}
                        </button>
                      </div>
                    </div>

                    {/* Panel Visibility Switches Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
                      {/* Viewers Panel */}
                      <div className="sim-mode-toggle-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.84rem' }}>Viewers Roster Panel</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>Chat balances &amp; betting simulator</div>
                          </div>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={layoutConfig.showViewersPanel}
                              onChange={e => onUpdateLayoutConfig({ ...layoutConfig, showViewersPanel: e.target.checked })}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>

                      {/* Entrants Sidebar */}
                      <div className="sim-mode-toggle-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.84rem' }}>Horses Entrants Sidebar</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>Racer entrant cards list</div>
                          </div>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={layoutConfig.showEntrantsSidebar}
                              onChange={e => onUpdateLayoutConfig({ ...layoutConfig, showEntrantsSidebar: e.target.checked })}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>

                      {/* Odds Bar */}
                      <div className="sim-mode-toggle-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.84rem' }}>Live Odds Readout Bar</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>Title, pool ribbon &amp; runner chips</div>
                          </div>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={layoutConfig.showOddsBar}
                              onChange={e => onUpdateLayoutConfig({ ...layoutConfig, showOddsBar: e.target.checked })}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>

                      {/* Bucket Floor */}
                      <div className="sim-mode-toggle-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.84rem' }}>Bucket Floor Controls</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>Bucket bounds status &amp; condense pile</div>
                          </div>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={layoutConfig.showBucketFloor}
                              onChange={e => onUpdateLayoutConfig({ ...layoutConfig, showBucketFloor: e.target.checked })}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Odds Bar Position Toggle */}
                    <div className="sim-mode-toggle-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.84rem' }}>
                            Odds Bar Position: {layoutConfig.oddsPlacement === 'top' ? 'Top (Above race visual stage)' : 'Bottom (Below race visual stage)'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                            Move the odds readout bar above or below the center OBS broadcast footage.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="cyber-btn-secondary"
                          onClick={() => onUpdateLayoutConfig({
                            ...layoutConfig,
                            oddsPlacement: layoutConfig.oddsPlacement === 'top' ? 'bottom' : 'top'
                          })}
                        >
                          {layoutConfig.oddsPlacement === 'top' ? '⬇️ Move to Bottom' : '⬆️ Move to Top'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Settings */}
              <div className="settings-section">
                <div className="section-title-row">
                  {isMuted ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} color="#22c55e" />}
                  <h3>Sound Effects &amp; Audio</h3>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className={`cyber-btn-secondary ${isMuted ? 'muted' : ''}`}
                    onClick={handleToggleMute}
                  >
                    {isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  </button>

                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <label className="section-label" style={{ marginBottom: 0 }}>Volume:</label>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={volume}
                      onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                      disabled={isMuted}
                      className="cyber-range"
                      style={{ width: '160px' }}
                    />
                    <span className="mono-val" style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)' }}>
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              TAB 5: 3D PHYSICS, TOKEN CAPACITY & DEBUG
              ========================================================================= */}
          {activeTab === 'physics' && (
            <>
              {/* Token Thresholds & Physics Settings */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Layers size={16} color="#fbbf24" />
                  <h3>3D Token Values &amp; Physics</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="theme-slider-card">
                    <div className="theme-slider-header">
                      <span className="slider-label">Silver Value</span>
                      <span className="slider-val mono-val">{silverThreshold} pts</span>
                    </div>
                    <input
                      type="range" min="10" max="250" step="10"
                      value={silverThreshold}
                      onChange={e => onUpdateThresholds(parseInt(e.target.value, 10), goldThreshold)}
                      className="cyber-range"
                    />
                  </div>

                  <div className="theme-slider-card">
                    <div className="theme-slider-header">
                      <span className="slider-label">Gold Value</span>
                      <span className="slider-val mono-val">{goldThreshold} pts</span>
                    </div>
                    <input
                      type="range" min="100" max="1000" step="50"
                      value={goldThreshold}
                      onChange={e => onUpdateThresholds(silverThreshold, parseInt(e.target.value, 10))}
                      className="cyber-range"
                    />
                  </div>

                  <div className="theme-slider-card">
                    <div className="theme-slider-header">
                      <span className="slider-label">Voxel Thickness</span>
                      <span className="slider-val mono-val">{thickness.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.1" max="0.6" step="0.05"
                      value={thickness}
                      onChange={e => onUpdateThickness(parseFloat(e.target.value))}
                      className="cyber-range"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.4rem' }}>
                  <button className="cyber-btn-danger" onClick={onClearArena}>
                    Clear All Dropped Arena Tokens
                  </button>
                </div>
              </div>

              {/* Token Pile Density & Combining Governor */}
              {bucketConfig && onUpdateBucketConfig && (
                <div className="settings-section">
                  <div className="section-title-row">
                    <Layers size={16} color="#f59e0b" />
                    <h3>Token Pile Density &amp; Combining Governor</h3>
                  </div>

                  <div className="calibration-density-section" style={{ margin: 0 }}>
                    <div className="calibration-density-header" style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.85rem' }}>
                          Physical Tokens Simulation
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                          Simulate and drop 2D/3D tokens into the arena. Turn off to disable tokens entirely.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`cyber-toggle-btn ${bucketConfig.enableTokens !== false ? 'active-amber' : ''}`}
                        onClick={() => onUpdateBucketConfig({ ...bucketConfig, enableTokens: bucketConfig.enableTokens === false })}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.74rem' }}
                      >
                        <span>{bucketConfig.enableTokens !== false ? 'Tokens: Enabled' : 'Tokens: Disabled'}</span>
                      </button>
                    </div>

                    <div className="calibration-density-header" style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.85rem' }}>
                          Hopper Panel Background
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                          Display a themed panel behind the hopper bounds. Hide for transparent OBS overlays.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`cyber-toggle-btn ${(bucketConfig.backgroundVisible !== undefined ? bucketConfig.backgroundVisible : !bucketConfig.hideWalls) ? 'active-amber' : ''}`}
                        onClick={() => {
                          const current = bucketConfig.backgroundVisible !== undefined ? bucketConfig.backgroundVisible : !bucketConfig.hideWalls;
                          onUpdateBucketConfig({ ...bucketConfig, backgroundVisible: !current, hideWalls: current });
                        }}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.74rem' }}
                      >
                        <span>{(bucketConfig.backgroundVisible !== undefined ? bucketConfig.backgroundVisible : !bucketConfig.hideWalls) ? 'Background: Visible' : 'Background: Hidden'}</span>
                      </button>
                    </div>

                    <div className="calibration-density-header">
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.85rem' }}>
                          Smart Hybrid Auto-Combining
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8E7D53)' }}>
                          Tokens stay separate to build full piles for smaller viewer counts, merging only when high volume occurs.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`cyber-toggle-btn ${bucketConfig.enableAutoCombine !== false ? 'active-amber' : ''}`}
                        onClick={() => onUpdateBucketConfig({ ...bucketConfig, enableAutoCombine: bucketConfig.enableAutoCombine === false })}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.74rem' }}
                      >
                        <span>{bucketConfig.enableAutoCombine !== false ? 'Auto-Combining: ON' : 'Auto-Combining: OFF'}</span>
                      </button>
                    </div>

                    <div className="calibration-controls-grid">
                      <div className="calibration-field">
                        <div className="field-label-row">
                          <span className="field-label">Viewer Token Threshold:</span>
                          <span className="field-val mono-val">{bucketConfig.combineThresholdPerUser ?? 40} coins/user</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={60}
                          step={1}
                          value={bucketConfig.combineThresholdPerUser ?? 40}
                          onChange={(e) => onUpdateBucketConfig({ ...bucketConfig, combineThresholdPerUser: Number(e.target.value) })}
                          className="cyber-range"
                          disabled={bucketConfig.enableAutoCombine === false}
                        />
                      </div>

                      <div className="calibration-field">
                        <div className="field-label-row">
                          <span className="field-label">Arena Safety Capacity:</span>
                          <span className="field-val mono-val">{bucketConfig.maxArenaTokens ?? 800} max coins</span>
                        </div>
                        <input
                          type="range"
                          min={60}
                          max={1200}
                          step={20}
                          value={bucketConfig.maxArenaTokens ?? 800}
                          onChange={(e) => onUpdateBucketConfig({ ...bucketConfig, maxArenaTokens: Number(e.target.value) })}
                          className="cyber-range"
                          disabled={bucketConfig.enableAutoCombine === false}
                        />
                      </div>
                    </div>

                    <div className="calibration-presets-section" style={{ marginTop: '0.35rem' }}>
                      <span className="calibration-presets-label">Density Presets:</span>
                      <div className="calibration-presets-buttons">
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => onUpdateBucketConfig({ ...bucketConfig, combineThresholdPerUser: 50, maxArenaTokens: 800, enableAutoCombine: true })}
                        >
                          🌋 Mountain (50/user • 800 max)
                        </button>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => onUpdateBucketConfig({ ...bucketConfig, combineThresholdPerUser: 30, maxArenaTokens: 400, enableAutoCombine: true })}
                        >
                          🎆 Lush Piles (30/user • 400 max)
                        </button>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => onUpdateBucketConfig({ ...bucketConfig, combineThresholdPerUser: 15, maxArenaTokens: 200, enableAutoCombine: true })}
                        >
                          ⚖️ Balanced (15/user • 200 max)
                        </button>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => onUpdateBucketConfig({ ...bucketConfig, combineThresholdPerUser: 8, maxArenaTokens: 100, enableAutoCombine: true })}
                        >
                          ⚡ Compact (8/user • 100 max)
                        </button>
                        <button
                          type="button"
                          className="preset-chip"
                          onClick={() => onUpdateBucketConfig({ ...bucketConfig, enableAutoCombine: false })}
                        >
                          🛑 Pure Coins (No Fusion)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug / Live Mode Toggle */}
              <div className="settings-section">
                <div className="section-title-row">
                  <Terminal size={16} color="#0284c7" />
                  <h3>Environment &amp; Debug Mode</h3>
                </div>

                <div className="sim-mode-toggle-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontSize: '0.9rem', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                        {isDebugMode ? '🛠️ Debug / Test Simulator Mode' : '🔴 Live Clean Streamer Mode'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
                        {isDebugMode
                          ? 'Enabled: Mock viewers, bulk paste tools, and chat test simulator are visible.'
                          : 'Live Mode: Clean interface for streaming. Mock users and simulator buttons are hidden so you only see live chat viewers.'}
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={isDebugMode}
                        onChange={e => onToggleDebugMode(e.target.checked)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="cyber-btn-secondary" onClick={onClose}>Close</button>
          <button className="cyber-btn-primary" onClick={handleSaveConfig}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};
