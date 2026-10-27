import { useState, useCallback, useEffect, useRef } from 'react';
import { PhysicsScene } from './PhysicsScene';
import { PhysicsScene2D } from './components/PhysicsScene2D';
import { breakdownBet, checkTierConsolidation, reloadTierConfigs } from './TokenManager';
import type {
  DropEvent,
  UserTokenConfig,
  Contest,
  BetOutcome,
  UserRosterItem,
  ContestStatus,
  WinCelebrationData,
  RenderEngine,
  PileLayout,
  CameraAngle3D,
  UiDisplayMode,
  BucketConfig,
  ScreenLayoutConfig,
  ThemeCustomizationConfig,
  PanelsConfig,
  HouseConfig,
  CelebrationHeaderConfig,
  TierConfig,
  OddsMode
} from './types/betting';
import { ContestOddsBar } from './components/ContestOddsBar';
import { EntrantsSidebar } from './components/EntrantsSidebar';
import { UserRosterPanel } from './components/UserRosterPanel';
import { TokenMakerModal } from './components/TokenMakerModal';
import { WinnerCelebrationModal } from './components/WinnerCelebrationModal';
import { WinLoseNotificationOverlay, type FloatingNotification } from './components/WinLoseNotificationOverlay';
import { SettingsModal } from './components/SettingsModal';
import { ViewControlsBar } from './components/ViewControlsBar';
import { CompactRaceDock } from './components/CompactRaceDock';
import { CompactTopOddsBar } from './components/CompactTopOddsBar';
import { MinimalCornerHUD } from './components/MinimalCornerHUD';
import { ViewersDrawer } from './components/ViewersDrawer';
import { TopbarPresetsDropdown } from './components/TopbarPresetsDropdown';
import { HorseEditorModal } from './components/HorseEditorModal';
import { BetLogModal } from './components/BetLogModal';
import { AdminUnlockModal } from './components/AdminUnlockModal';
import { HopperBoundsPreviewOverlay } from './components/HopperBoundsPreviewOverlay';
import { HopperBackdropPanel } from './components/HopperBackdropPanel';
import { ViewerView } from './components/ViewerView';
import { ConfigView } from './components/ConfigView';
import { isImageSource } from './components/IconDisplay';
import { soundEffects } from './services/soundEffects';
import { twitchChatService } from './services/twitchChatService';
import { storageService, onStreamSync, broadcastStreamSync, claimBetProcessing, claimTokenUpdateProcessing } from './services/storageService';
import { styleService } from './services/styleService';
import { Settings, Tv, Volume2, VolumeX, Lock, Play, RotateCcw, Trophy, Sliders, Layers, FileText, ShieldCheck, ShieldAlert, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import './index.css';

// Initial 20-Horse Race Contest
const INITIAL_OUTCOMES: BetOutcome[] = [
  { id: '1', number: 1, name: 'Thunderbolt', icon: '⚡', color: '#ef4444', totalBet: 0, bettorCount: 0, odds: 2.0, manualOdds: 2.0, percentage: 0 },
  { id: '2', number: 2, name: 'Silver Star', icon: '⭐', color: '#94a3b8', totalBet: 0, bettorCount: 0, odds: 2.5, manualOdds: 2.5, percentage: 0 },
  { id: '3', number: 3, name: 'Blazing Comet', icon: '☄️', color: '#f97316', totalBet: 0, bettorCount: 0, odds: 3.0, manualOdds: 3.0, percentage: 0 },
  { id: '4', number: 4, name: 'Shadow Runner', icon: '🌑', color: '#64748b', totalBet: 0, bettorCount: 0, odds: 4.0, manualOdds: 4.0, percentage: 0 },
  { id: '5', number: 5, name: 'Golden Hoof', icon: '🏆', color: '#eab308', totalBet: 0, bettorCount: 0, odds: 5.0, manualOdds: 5.0, percentage: 0 },
  { id: '6', number: 6, name: 'Midnight Storm', icon: '🌪️', color: '#3b82f6', totalBet: 0, bettorCount: 0, odds: 3.5, manualOdds: 3.5, percentage: 0 },
  { id: '7', number: 7, name: 'Emerald Breeze', icon: '🍃', color: '#10b981', totalBet: 0, bettorCount: 0, odds: 4.5, manualOdds: 4.5, percentage: 0 },
  { id: '8', number: 8, name: 'Crimson Fury', icon: '🔥', color: '#dc2626', totalBet: 0, bettorCount: 0, odds: 6.0, manualOdds: 6.0, percentage: 0 },
  { id: '9', number: 9, name: 'Iron Will', icon: '🛡️', color: '#71717a', totalBet: 0, bettorCount: 0, odds: 7.0, manualOdds: 7.0, percentage: 0 },
  { id: '10', number: 10, name: 'Solar Flare', icon: '☀️', color: '#f59e0b', totalBet: 0, bettorCount: 0, odds: 5.5, manualOdds: 5.5, percentage: 0 },
  { id: '11', number: 11, name: 'Mystic Dream', icon: '🔮', color: '#8b5cf6', totalBet: 0, bettorCount: 0, odds: 8.0, manualOdds: 8.0, percentage: 0 },
  { id: '12', number: 12, name: 'Neon Dash', icon: '⚡', color: '#06b6d4', totalBet: 0, bettorCount: 0, odds: 4.0, manualOdds: 4.0, percentage: 0 },
  { id: '13', number: 13, name: 'Wild Mustang', icon: '🐎', color: '#d97706', totalBet: 0, bettorCount: 0, odds: 6.5, manualOdds: 6.5, percentage: 0 },
  { id: '14', number: 14, name: 'Phantom Ghost', icon: '👻', color: '#a855f7', totalBet: 0, bettorCount: 0, odds: 10.0, manualOdds: 10.0, percentage: 0 },
  { id: '15', number: 15, name: 'Vortex Jet', icon: '🌀', color: '#0284c7', totalBet: 0, bettorCount: 0, odds: 7.5, manualOdds: 7.5, percentage: 0 },
  { id: '16', number: 16, name: 'Frost Bite', icon: '❄️', color: '#38bdf8', totalBet: 0, bettorCount: 0, odds: 9.0, manualOdds: 9.0, percentage: 0 },
  { id: '17', number: 17, name: 'Ruby Rocket', icon: '🚀', color: '#e11d48', totalBet: 0, bettorCount: 0, odds: 12.0, manualOdds: 12.0, percentage: 0 },
  { id: '18', number: 18, name: 'Thunder Clap', icon: '🌩️', color: '#6366f1', totalBet: 0, bettorCount: 0, odds: 8.5, manualOdds: 8.5, percentage: 0 },
  { id: '19', number: 19, name: 'Desert Mirage', icon: '🏜️', color: '#ca8a04', totalBet: 0, bettorCount: 0, odds: 15.0, manualOdds: 15.0, percentage: 0 },
  { id: '20', number: 20, name: 'Apex Predator', icon: '🦁', color: '#f43f5e', totalBet: 0, bettorCount: 0, odds: 20.0, manualOdds: 20.0, percentage: 0 },
];

const INITIAL_CONTEST: Contest = {
  id: 'c1',
  title: '🏇 Royal Grand Derby (20-Horse Race)',
  status: 'open',
  oddsMode: 'auto',
  outcomes: INITIAL_OUTCOMES,
  totalPool: 0,
  createdAt: Date.now(),
  minBet: 5,
  maxBet: 50000,
  bets: [],
};

const INITIAL_USERS: UserRosterItem[] = [
  { id: 'u1', name: 'Helios', tokens: 75000, currentBetInput: '250', config: { emoji: '🥕', metalness: 0.2, roughness: 0.7, colorTint: '#fb923c' }, isMockUser: true },
  { id: 'u2', name: 'Solar', tokens: 90000, currentBetInput: '500', config: { emoji: '👑', metalness: 0.95, roughness: 0.1, colorTint: '#fbbf24' }, isMockUser: true },
  { id: 'u3', name: 'Matrox', tokens: 50000, currentBetInput: '100', config: { emoji: '👻', metalness: 0.1, roughness: 0.8, colorTint: '#c084fc' }, isMockUser: true },
  { id: 'u4', name: 'Luna_Cat', tokens: 62000, currentBetInput: '200', config: { emoji: '🦄', metalness: 0.8, roughness: 0.2, colorTint: '#f472b6' }, isMockUser: true },
  { id: 'u5', name: 'CyberSam', tokens: 88000, currentBetInput: '350', config: { emoji: '👾', metalness: 0.9, roughness: 0.15, colorTint: '#38bdf8' }, isMockUser: true },
  { id: 'u6', name: 'PixelWhale', tokens: 120000, currentBetInput: '1000', config: { emoji: '💎', metalness: 1.0, roughness: 0.05, colorTint: '#22d3ee' }, isMockUser: true },
  { id: 'u7', name: 'Valkyrie99', tokens: 45000, currentBetInput: '150', config: { emoji: '⚔️', metalness: 0.7, roughness: 0.3, colorTint: '#ef4444' }, isMockUser: true },
  { id: 'u8', name: 'NeonFox', tokens: 58000, currentBetInput: '200', config: { emoji: '🦊', metalness: 0.3, roughness: 0.6, colorTint: '#f97316' }, isMockUser: true },
];

function App() {
  const [contest, setContest] = useState<Contest>(() => storageService.getContest() || INITIAL_CONTEST);
  const [users, setUsers] = useState<UserRosterItem[]>(() => storageService.getUsers() || INITIAL_USERS);
  const [lastDrop, setLastDrop] = useState<DropEvent | null>(null);

  // Flag to suppress echo broadcasts when state was updated from a remote sync event
  const isRemoteSyncRef = useRef<{ contest: boolean; users: boolean }>({ contest: false, users: false });
  const handleBetRef = useRef<((userId: string, amount: number, outcomeId: string) => void) | null>(null);

  // Auto-persist Contest & Users to localStorage (skip broadcast if matching remote or already saved)
  useEffect(() => {
    const json = JSON.stringify(contest);
    if (json === storageService.getLastSavedContestJson()) {
      isRemoteSyncRef.current.contest = false;
      return;
    }
    if (isRemoteSyncRef.current.contest) {
      isRemoteSyncRef.current.contest = false;
      storageService.recordContestJson(json);
      return;
    }
    storageService.saveContest(contest);
  }, [contest]);

  useEffect(() => {
    const json = JSON.stringify(users);
    if (json === storageService.getLastSavedUsersJson()) {
      isRemoteSyncRef.current.users = false;
      return;
    }
    if (isRemoteSyncRef.current.users) {
      isRemoteSyncRef.current.users = false;
      storageService.recordUsersJson(json);
      return;
    }
    storageService.saveUsers(users);
  }, [users]);


  // Storage & Preferences
  const [activeStyle, setActiveStyle] = useState<string>(() => storageService.getActiveStyle());

  // Apply active skin theme & synchronize browser tab favicon with style service
  useEffect(() => {
    styleService.setActiveStyle(activeStyle);
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = styleService.getImage('tp_ico.png');
    }
  }, [activeStyle]);

  const handleUpdateActiveStyle = (style: string) => {
    setActiveStyle(style);
    storageService.saveActiveStyle(style);
    styleService.setActiveStyle(style);
  };

  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => storageService.getDebugMode());
  const [defaultTokenConfig, setDefaultTokenConfig] = useState<UserTokenConfig>(() => storageService.getDefaultToken());
  const [bucketConfig, setBucketConfig] = useState<BucketConfig>(() => storageService.getBucketConfig());
  const [screenLayout, setScreenLayout] = useState<ScreenLayoutConfig>(() => storageService.getScreenLayout());
  const [themeConfig, setThemeConfig] = useState<ThemeCustomizationConfig>(() => storageService.getThemeConfig());
  const [panelsConfig, setPanelsConfig] = useState<PanelsConfig>(() => storageService.getPanelsConfig());
  const [celebrationHeader, setCelebrationHeader] = useState<CelebrationHeaderConfig>(() => storageService.getCelebrationHeaderConfig());

  const handleUpdateCelebrationHeader = (config: CelebrationHeaderConfig) => {
    setCelebrationHeader(config);
    storageService.saveCelebrationHeaderConfig(config);
  };

  // Apply active theme colors & corner styles to document root
  useEffect(() => {
    storageService.applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  const saveThemeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateThemeConfig = (updater: ThemeCustomizationConfig | ((prev: ThemeCustomizationConfig) => ThemeCustomizationConfig)) => {
    setThemeConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Debounce localStorage writes so dragging color sliders never causes disk I/O hitching
      if (saveThemeTimeoutRef.current) {
        clearTimeout(saveThemeTimeoutRef.current);
      }
      saveThemeTimeoutRef.current = setTimeout(() => {
        storageService.saveThemeConfig(next);
        saveThemeTimeoutRef.current = null;
      }, 250);

      storageService.applyThemeToDocument(next);
      return next;
    });
  };

  const handleUpdateScreenLayout = (updater: ScreenLayoutConfig | ((prev: ScreenLayoutConfig) => ScreenLayoutConfig)) => {
    setScreenLayout(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      storageService.saveScreenLayout(next);
      return next;
    });
  };

  // Dynamic Resizable Sidebar Widths (clamped 220px to 580px, default 320px)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => {
    return screenLayout.sidebarLeftWidth ?? 320;
  });
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => {
    return screenLayout.sidebarRightWidth ?? 320;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState<'left' | 'right' | null>(null);

  const startDragXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const mainGridRef = useRef<HTMLElement | null>(null);
  const leftTooltipRef = useRef<HTMLSpanElement | null>(null);
  const rightTooltipRef = useRef<HTMLSpanElement | null>(null);
  const sidebarRafRef = useRef<number | null>(null);
  const currentLeftWidthRef = useRef<number>(leftSidebarWidth);
  const currentRightWidthRef = useRef<number>(rightSidebarWidth);

  // Clean up timers & RAF on unmount
  useEffect(() => {
    return () => {
      if (saveThemeTimeoutRef.current) clearTimeout(saveThemeTimeoutRef.current);
      if (sidebarRafRef.current) cancelAnimationFrame(sidebarRafRef.current);
    };
  }, []);

  // Keep local width state in sync if screenLayout changes from outside
  useEffect(() => {
    if (screenLayout.sidebarLeftWidth && screenLayout.sidebarLeftWidth !== leftSidebarWidth && !isResizingSidebar) {
      setLeftSidebarWidth(screenLayout.sidebarLeftWidth);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-left-width', `${screenLayout.sidebarLeftWidth}px`);
      }
    }
  }, [screenLayout.sidebarLeftWidth, isResizingSidebar, leftSidebarWidth]);

  useEffect(() => {
    if (screenLayout.sidebarRightWidth && screenLayout.sidebarRightWidth !== rightSidebarWidth && !isResizingSidebar) {
      setRightSidebarWidth(screenLayout.sidebarRightWidth);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-right-width', `${screenLayout.sidebarRightWidth}px`);
      }
    }
  }, [screenLayout.sidebarRightWidth, isResizingSidebar, rightSidebarWidth]);

  // Global mouse cursor & selection styling during drag
  useEffect(() => {
    if (isResizingSidebar) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  // Left sidebar resize drag handler - direct CSS var updates via RAF for 120fps fluid dragging
  const handleStartResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar('left');
    startDragXRef.current = e.clientX;
    startWidthRef.current = leftSidebarWidth;
    currentLeftWidthRef.current = leftSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startDragXRef.current;
      const maxAllowed = Math.min(580, window.innerWidth - rightSidebarWidth - 280);
      const nextWidth = Math.max(220, Math.min(maxAllowed, startWidthRef.current + deltaX));
      currentLeftWidthRef.current = nextWidth;

      if (!sidebarRafRef.current) {
        sidebarRafRef.current = requestAnimationFrame(() => {
          sidebarRafRef.current = null;
          const w = currentLeftWidthRef.current;
          if (mainGridRef.current) {
            mainGridRef.current.style.setProperty('--sidebar-left-width', `${w}px`);
          }
          if (leftTooltipRef.current) {
            leftTooltipRef.current.textContent = `${w}px`;
          }
        });
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (sidebarRafRef.current) {
        cancelAnimationFrame(sidebarRafRef.current);
        sidebarRafRef.current = null;
      }
      setIsResizingSidebar(null);

      const deltaX = upEvent.clientX - startDragXRef.current;
      const maxAllowed = Math.min(580, window.innerWidth - rightSidebarWidth - 280);
      const finalWidth = Math.max(220, Math.min(maxAllowed, startWidthRef.current + deltaX));
      setLeftSidebarWidth(finalWidth);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-left-width', `${finalWidth}px`);
      }
      handleUpdateScreenLayout(prev => ({ ...prev, sidebarLeftWidth: finalWidth }));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Right sidebar resize drag handler - direct CSS var updates via RAF for 120fps fluid dragging
  const handleStartResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar('right');
    startDragXRef.current = e.clientX;
    startWidthRef.current = rightSidebarWidth;
    currentRightWidthRef.current = rightSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Dragging mouse to the left increases right sidebar width
      const deltaX = startDragXRef.current - moveEvent.clientX;
      const maxAllowed = Math.min(580, window.innerWidth - leftSidebarWidth - 280);
      const nextWidth = Math.max(220, Math.min(maxAllowed, startWidthRef.current + deltaX));
      currentRightWidthRef.current = nextWidth;

      if (!sidebarRafRef.current) {
        sidebarRafRef.current = requestAnimationFrame(() => {
          sidebarRafRef.current = null;
          const w = currentRightWidthRef.current;
          if (mainGridRef.current) {
            mainGridRef.current.style.setProperty('--sidebar-right-width', `${w}px`);
          }
          if (rightTooltipRef.current) {
            rightTooltipRef.current.textContent = `${w}px`;
          }
        });
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (sidebarRafRef.current) {
        cancelAnimationFrame(sidebarRafRef.current);
        sidebarRafRef.current = null;
      }
      setIsResizingSidebar(null);

      const deltaX = startDragXRef.current - upEvent.clientX;
      const maxAllowed = Math.min(580, window.innerWidth - leftSidebarWidth - 280);
      const finalWidth = Math.max(220, Math.min(maxAllowed, startWidthRef.current + deltaX));
      setRightSidebarWidth(finalWidth);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-right-width', `${finalWidth}px`);
      }
      handleUpdateScreenLayout(prev => ({ ...prev, sidebarRightWidth: finalWidth }));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Double-click reset to standard 320px
  const handleResetSidebarWidth = (side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftSidebarWidth(320);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-left-width', '320px');
      }
      handleUpdateScreenLayout(prev => ({ ...prev, sidebarLeftWidth: 320 }));
    } else {
      setRightSidebarWidth(320);
      if (mainGridRef.current) {
        mainGridRef.current.style.setProperty('--sidebar-right-width', '320px');
      }
      handleUpdateScreenLayout(prev => ({ ...prev, sidebarRightWidth: 320 }));
    }
    soundEffects.playTokenClink();
  };

  // Physics & Engine Mode
  const [renderEngine, setRenderEngine] = useState<RenderEngine>('2d');
  const [pileLayout, setPileLayout] = useState<PileLayout>('bottom-center');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle3D>('perspective');
  const [uiMode, setUiMode] = useState<UiDisplayMode>(() => {
    if (typeof window === 'undefined') return 'full';
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const pathname = window.location.pathname.toLowerCase();
    const explicitHtmlMode = (window as any).__TokenPile_MODE__;

    // Detect if running inside an iframe (such as Twitch extension panel or creator config modal)
    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    // 0. Dedicated HTML file entry points (config.html, panel.html, viewer.html)
    if (explicitHtmlMode === 'config' || pathname.endsWith('config.html')) {
      return 'config';
    }
    if (explicitHtmlMode === 'panel' || explicitHtmlMode === 'viewer' || pathname.endsWith('panel.html') || pathname.endsWith('viewer.html')) {
      return 'viewer';
    }
    if (
      explicitHtmlMode === 'obs' ||
      pathname.endsWith('obs.html') ||
      pathname.includes('obs.html') ||
      pathname.endsWith('/obs') ||
      pathname === '/obs'
    ) {
      return 'obs';
    }

    // 1. Explicit configuration mode (from query param or Twitch Creator Dashboard)
    if (mode === 'config' || params.get('config') === '1') {
      return 'config';
    }

    // 2. OBS / Video Overlay mode
    if (mode === 'obs' || params.get('obs') === '1' || params.get('overlay') === '1' || params.get('anchor') === 'video_overlay') {
      return 'obs';
    }

    // 3. Compact / Minimal HUD modes
    if (mode === 'compact' || mode === 'minimal') {
      return mode;
    }

    // 4. Viewer / Mobile / Panel mode
    if (
      mode === 'viewer' ||
      mode === 'panel' ||
      params.get('anchor') === 'panel' ||
      params.get('viewer') === '1' ||
      params.get('panel') === '1' ||
      params.get('slip') === '1' ||
      params.get('room')
    ) {
      return 'viewer';
    }

    // 5. Embedded inside any iframe on Twitch:
    // Always default to viewer mode (unless explicitly requesting 'dashboard')
    if (isIframe) {
      if (mode === 'dashboard') return 'full';
      return 'viewer';
    }

    // 6. Top-level standalone browser tab defaults to full GM streamer dashboard
    return 'full';
  });

  // Sync document body class for scrolling when in viewer/config modes and transparency when in obs mode
  useEffect(() => {
    if (uiMode === 'viewer') {
      document.body.classList.add('in-viewer-mode');
      document.documentElement.classList.add('in-viewer-mode');
    } else {
      document.body.classList.remove('in-viewer-mode');
      document.documentElement.classList.remove('in-viewer-mode');
    }

    if (uiMode === 'config') {
      document.body.classList.add('in-config-mode');
      document.documentElement.classList.add('in-config-mode');
    } else {
      document.body.classList.remove('in-config-mode');
      document.documentElement.classList.remove('in-config-mode');
    }

    if (uiMode === 'obs') {
      document.body.classList.add('in-obs-mode');
      document.documentElement.classList.add('in-obs-mode');
    } else {
      document.body.classList.remove('in-obs-mode');
      document.documentElement.classList.remove('in-obs-mode');
    }

    return () => {
      document.body.classList.remove('in-viewer-mode', 'in-obs-mode', 'in-config-mode');
      document.documentElement.classList.remove('in-viewer-mode', 'in-obs-mode', 'in-config-mode');
    };
  }, [uiMode]);

  const [thickness, setThickness] = useState(0.25);
  const [pileOffset, setPileOffset] = useState({ x: 0, y: 0 });
  const [silverThreshold, setSilverThreshold] = useState(100);
  const [goldThreshold, setGoldThreshold] = useState(500);
  const [tokenTiers, setTokenTiers] = useState<TierConfig[]>(() => storageService.getTokenTiers());
  const [onResetTrigger, setOnResetTrigger] = useState(0);
  const [condenseTrigger, setCondenseTrigger] = useState(0);
  const [jostleTrigger, setJostleTrigger] = useState(0);
  const [isJostling, setIsJostling] = useState(false);
  const [isWinnerBurst, setIsWinnerBurst] = useState(false);
  const userBetAccumulatorRef = useRef<Map<string, number>>(new Map());

  // Trip physics switch to unfreeze and rejostle all tokens in the hopper
  const handleJostleTokens = () => {
    setJostleTrigger(p => p + 1);
    broadcastStreamSync('JOSTLE_TOKENS', {});
    soundEffects.playTokenClink();
    setIsJostling(true);
    setTimeout(() => setIsJostling(false), 450);
  };

  // House & GM Configuration (Streamer identity for quick bets and prize pools)
  const [houseConfig, setHouseConfig] = useState<HouseConfig>(() => {
    try {
      const saved = localStorage.getItem('TokenPile_house_config');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      name: 'The House',
      betAmount: 500,
      emoji: '🏛️',
      defaultPrizePool: 0
    };
  });

  const handleUpdateHouseConfig = useCallback((newConfig: HouseConfig) => {
    setHouseConfig(newConfig);
    try {
      localStorage.setItem('TokenPile_house_config', JSON.stringify(newConfig));
    } catch { }
  }, []);

  // Layout & Calibration State
  const [filterText, setFilterText] = useState('');
  const [presetCascadeKey, setPresetCascadeKey] = useState<number>(() => Date.now());
  const [showTestRaceBg, setShowTestRaceBg] = useState<boolean>(() => {
    try {
      const saved = storageService.getBucketConfig();
      return !!saved.showCalibrationGuide;
    } catch {
      return false;
    }
  });

  // Modals & Drawers
  const [activeTokenMakerUser, setActiveTokenMakerUser] = useState<UserRosterItem | null>(null);
  const [celebrationData, setCelebrationData] = useState<WinCelebrationData | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewerDrawerOpen, setIsViewerDrawerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [floatingNotifications, setFloatingNotifications] = useState<FloatingNotification[]>([]);
  const [isTopbarCompact, setIsTopbarCompact] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('compact') === '1' || params.get('stream') === '1' || params.get('mirror') === '1') {
        return true;
      }
      return localStorage.getItem('TokenPile_topbar_compact') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleTopbarCompact = () => {
    setIsTopbarCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem('TokenPile_topbar_compact', String(next));
      } catch { }
      return next;
    });
  };
  const [horseEditorState, setHorseEditorState] = useState<{
    isOpen: boolean;
    horse: BetOutcome | null;
    mode: 'single' | 'bulk';
  }>({
    isOpen: false,
    horse: null,
    mode: 'single'
  });
  const [isLockedShineActive, setIsLockedShineActive] = useState(false);
  const [isBetLogOpen, setIsBetLogOpen] = useState(false);
  const [isBucketTrapdoorOpen, setIsBucketTrapdoorOpen] = useState(false);
  const [isViewControlsOpen, setIsViewControlsOpen] = useState(false);

  // When running as authoritative broadcaster dashboard, broadcast snapshot once on initial mount
  // so the local relay server & newly connected OBS sources get the initial state snapshot.
  const hasBroadcastInitialSnapshotRef = useRef(false);
  useEffect(() => {
    if (uiMode === 'full' && !hasBroadcastInitialSnapshotRef.current) {
      hasBroadcastInitialSnapshotRef.current = true;
      const timer = setTimeout(() => {
        broadcastStreamSync('STATE_SNAPSHOT', {
          contest,
          users,
          twitch: twitchChatService.getConfig(),
          style: activeStyle,
          celebration: isCelebrationOpen ? celebrationData : null,
          renderEngine,
          bucketConfig,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [uiMode]);

  const handleToggleRenderEngine = (engine: RenderEngine) => {
    setRenderEngine(engine);
    broadcastStreamSync('ENGINE_UPDATED', { engine });
  };

  // Admin & Permission Security State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => storageService.isAdminUnlocked());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const lockBetsRef = useRef<() => void>(() => { });
  const reopenBetsRef = useRef<() => void>(() => { });
  const resetContestRef = useRef<() => void>(() => { });
  const updateUserPointsRef = useRef<(userId: string, points: number) => void>(() => { });

  const handleAdminUnlock = (enteredPass: string): boolean => {
    const currentPass = storageService.getAdminPasscode();
    if (enteredPass === currentPass) {
      storageService.setAdminUnlocked(true);
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const handleAdminLock = () => {
    storageService.setAdminUnlocked(false);
    setIsAdmin(false);
  };

  const handleUpdateAdminPasscode = (oldPass: string, newPass: string): boolean => {
    const currentPass = storageService.getAdminPasscode();
    if (oldPass !== currentPass) return false;
    if (!newPass.trim()) return false;
    storageService.saveAdminPasscode(newPass.trim());
    return true;
  };

  // Extreme Stress Test: 1,000 viewers @ 4 bets/sec
  const [isSwarmActive, setIsSwarmActive] = useState(false);
  const [swarmCount, setSwarmCount] = useState(0);
  const swarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (swarmIntervalRef.current) {
        clearInterval(swarmIntervalRef.current);
        swarmIntervalRef.current = null;
      }
    };
  }, []);

  // Tray tab tracking and live bound adjustment feedback
  const [controlsTrayTab, setControlsTrayTab] = useState<'bucket' | 'layout' | 'arena' | 'theme'>('bucket');
  const [isAdjustingHopperBounds, setIsAdjustingHopperBounds] = useState<boolean>(false);
  const saveBucketTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateBucketConfig = useCallback((newConfig: BucketConfig) => {
    setBucketConfig(newConfig);

    // Debounce localStorage persistence to avoid blocking UI during slider dragging
    if (saveBucketTimeoutRef.current) {
      clearTimeout(saveBucketTimeoutRef.current);
    }
    saveBucketTimeoutRef.current = setTimeout(() => {
      storageService.saveBucketConfig(newConfig);
      broadcastStreamSync('BUCKET_CONFIG_UPDATED', newConfig);
      saveBucketTimeoutRef.current = null;
    }, 250);

    if (newConfig.showCalibrationGuide !== bucketConfig.showCalibrationGuide) {
      setShowTestRaceBg(!!newConfig.showCalibrationGuide);
    }
  }, [bucketConfig.showCalibrationGuide]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveBucketTimeoutRef.current) {
        clearTimeout(saveBucketTimeoutRef.current);
      }
    };
  }, []);

  // Toggle both OBS Bound Guide and Bucket Calibration Guide at once
  const isDebugGuidesActive = showTestRaceBg || (bucketConfig?.showCalibrationGuide ?? false);

  const handleToggleDebugGuides = () => {
    const nextState = !isDebugGuidesActive;
    setShowTestRaceBg(nextState);
    handleUpdateBucketConfig({
      ...bucketConfig,
      showCalibrationGuide: nextState
    });
  };

  // Safe State Refs
  const usersRef = useRef(users);
  const contestRef = useRef(contest);

  useEffect(() => {
    usersRef.current = users;
    contestRef.current = contest;
  }, [users, contest]);

  // Real-time synchronization for OBS Browser Source <-> Admin Dashboard <-> Viewer Mode
  useEffect(() => {
    const unsubscribe = onStreamSync((data) => {
      // 1. Initial State Hydration / Live Broadcaster Snapshot Sync
      if ((data.type === 'INITIAL_STATE' || data.type === 'STATE_SNAPSHOT') && data.payload) {
        if (data.payload.contest) {
          storageService.markRemoteContestSaved(data.payload.contest);
          isRemoteSyncRef.current.contest = true;
          contestRef.current = data.payload.contest;
          setContest(data.payload.contest);
        }
        if (data.payload.users) {
          storageService.markRemoteUsersSaved(data.payload.users);
          isRemoteSyncRef.current.users = true;
          usersRef.current = data.payload.users;
          setUsers(data.payload.users);
        }
        if (data.payload.twitch) {
          twitchChatService.saveConfig(data.payload.twitch);
          if (data.payload.twitch.channel && data.payload.twitch.autoConnect) {
            twitchChatService.connect();
          }
        }
        if (data.payload.style) {
          setActiveStyle(data.payload.style);
          styleService.setActiveStyle(data.payload.style);
        }
        if (data.payload.celebration) {
          setCelebrationData(data.payload.celebration);
          setIsCelebrationOpen(true);
        }
        if (data.payload.renderEngine) {
          setRenderEngine(data.payload.renderEngine);
        }
        if (data.payload.bucketConfig) {
          setBucketConfig(data.payload.bucketConfig);
        }
      } else if (data.type === 'TWITCH_CONFIG_UPDATED' && data.payload) {
        twitchChatService.saveConfig(data.payload);
        if (data.payload.channel && data.payload.autoConnect) {
          twitchChatService.connect();
        }
      } else if (data.type === 'CONTEST_UPDATED' && data.payload) {
        const incomingJson = JSON.stringify(data.payload);
        if (incomingJson === storageService.getLastSavedContestJson()) return;
        storageService.markRemoteContestSaved(data.payload);
        isRemoteSyncRef.current.contest = true;
        contestRef.current = data.payload;
        setContest(data.payload);
      } else if (data.type === 'USERS_UPDATED' && data.payload) {
        const incomingJson = JSON.stringify(data.payload);
        if (incomingJson === storageService.getLastSavedUsersJson()) return;
        storageService.markRemoteUsersSaved(data.payload);
        isRemoteSyncRef.current.users = true;
        usersRef.current = data.payload;
        setUsers(data.payload);
      } else if (data.type === 'ACTIVE_STYLE_UPDATED' && data.payload?.style) {
        setActiveStyle(data.payload.style);
        styleService.setActiveStyle(data.payload.style);
      } else if (data.type === 'TOKEN_TIERS_UPDATED' && Array.isArray(data.payload)) {
        setTokenTiers(data.payload);
        reloadTierConfigs(data.payload);
      } else if (data.type === 'TOKEN_DROP_EVENT' && data.payload) {
        // Physical Token Coin Drop into the Hopper
        const drop = data.payload.dropEvent || data.payload;
        setLastDrop(drop);
        if (data.payload.isPot) {
          soundEffects.playCashout();
        } else {
          soundEffects.playBetDrop();
        }
        if (data.payload.notification) {
          setFloatingNotifications(prev => [...prev.slice(-5), data.payload.notification]);
        }
      } else if (data.type === 'CASCADE_ANIMATION') {
        // Staggered Horse Card Filing-In Animation
        setPresetCascadeKey(data.payload?.key || Date.now());
        soundEffects.playTokenClink();
      } else if (data.type === 'WINNER_CELEBRATION' && data.payload?.celebrationData) {
        // Victory Screen Celebration Modal & Confetti Burst
        setCelebrationData(data.payload.celebrationData);
        setIsCelebrationOpen(true);
        setIsWinnerBurst(true);
        setJostleTrigger(p => p + 1);
        setTimeout(() => setIsWinnerBurst(false), 3000);
      } else if (data.type === 'CLOSE_CELEBRATION') {
        setIsCelebrationOpen(false);
      } else if (data.type === 'TRAPDOOR_EVENT') {
        const isOpen = Boolean(data.payload?.open);
        setIsBucketTrapdoorOpen(isOpen);
        if (isOpen) {
          setJostleTrigger(p => p + 1);
        } else {
          setOnResetTrigger(p => p + 1);
        }
      } else if (data.type === 'FLOATING_NOTIFICATIONS' && Array.isArray(data.payload?.notifications)) {
        setFloatingNotifications(prev => [...prev, ...data.payload.notifications]);
        soundEffects.playCashout();
      } else if (data.type === 'RESET_CONTEST') {
        userBetAccumulatorRef.current.clear();
        setCelebrationData(null);
        setIsCelebrationOpen(false);
        setIsWinnerBurst(false);
        setIsBucketTrapdoorOpen(false);
        setOnResetTrigger(p => p + 1);
        setPresetCascadeKey(data.payload?.key || Date.now());
        soundEffects.playTokenClink();
      } else if (data.type === 'CLEAR_ARENA') {
        userBetAccumulatorRef.current.clear();
        setOnResetTrigger(p => p + 1);
        soundEffects.playTokenClink();
      } else if (data.type === 'CONDENSE_PILE') {
        setCondenseTrigger(p => p + 1);
        setJostleTrigger(p => p + 1);
        soundEffects.playCashout();
      } else if (data.type === 'JOSTLE_TOKENS') {
        setJostleTrigger(p => p + 1);
      } else if (data.type === 'ENGINE_UPDATED' && data.payload?.engine) {
        setRenderEngine(data.payload.engine);
      } else if (data.type === 'BUCKET_CONFIG_UPDATED' && data.payload) {
        setBucketConfig(data.payload);
      } else if (data.type === 'VIEWER_BET_REQUEST' && data.payload) {
        // ONLY authoritative Broadcaster dashboard processes viewer bet deductions
        if (uiMode !== 'full') return;

        const { betId, userId, userName, userConfig, outcomeId, amount } = data.payload;
        if (!outcomeId || !amount || amount <= 0) return;

        // Atomic deduplication: exactly one broadcaster instance claims and processes this bet request
        const effectiveBetId = betId || data.msgId || `${userId}_${outcomeId}_${amount}_${data.timestamp || Date.now()}`;
        if (!claimBetProcessing(effectiveBetId)) {
          return;
        }

        // Security & Moderation: Sanitize viewer token emoji
        const rawConfig = userConfig || data.payload.tokenConfig;
        const safeConfig = rawConfig ? { ...rawConfig } : { ...storageService.getDefaultToken() };
        if (safeConfig.emoji && isImageSource(safeConfig.emoji)) {
          safeConfig.emoji = '🪙';
        }

        const curUsers = usersRef.current;
        let targetUser = curUsers.find(u => u.id === userId || (userName && u.name.toLowerCase() === userName.toLowerCase()));
        if (!targetUser) {
          const startingTokens = twitchChatService.getConfig().startingTokens || 50000;
          const newUser: UserRosterItem = {
            id: userId || `viewer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: userName || 'Viewer',
            tokens: startingTokens,
            currentBetInput: String(amount),
            config: safeConfig,
            isMockUser: false
          };
          targetUser = newUser;
          const nextUsers = [...curUsers, newUser];
          usersRef.current = nextUsers;
          setUsers(nextUsers);
        } else if (rawConfig) {
          targetUser = {
            ...targetUser,
            config: { ...targetUser.config, ...safeConfig }
          };
          const nextUsers = curUsers.map(u => u.id === targetUser!.id ? targetUser! : u);
          usersRef.current = nextUsers;
          setUsers(nextUsers);
        }

        if (handleBetRef.current) {
          handleBetRef.current(targetUser.id, amount, outcomeId);
        }
      } else if (data.type === 'VIEWER_TOKEN_UPDATED' && data.payload) {
        // ONLY authoritative Broadcaster dashboard updates user roster config
        if (uiMode !== 'full') return;

        const { updateId, userId, userName, config } = data.payload;
        const effectiveUpdateId = updateId || data.msgId || `${userId}_${data.timestamp || Date.now()}`;
        if (!claimTokenUpdateProcessing(effectiveUpdateId)) {
          return;
        }

        const curUsers = usersRef.current;
        const targetIndex = curUsers.findIndex(u => u.id === userId || (userName && u.name.toLowerCase() === userName.toLowerCase()));
        if (targetIndex !== -1 && config) {
          const safeConfig = { ...config };
          if (safeConfig.emoji && isImageSource(safeConfig.emoji)) {
            safeConfig.emoji = '🪙';
          }
          const nextUsers = [...curUsers];
          nextUsers[targetIndex] = {
            ...nextUsers[targetIndex],
            config: { ...nextUsers[targetIndex].config, ...safeConfig }
          };
          usersRef.current = nextUsers;
          setUsers(nextUsers);
        }
      }
    });
    return unsubscribe;
  }, [uiMode]);

  const recalculateOdds = (outcomes: BetOutcome[], totalPool: number, oddsMode?: OddsMode): BetOutcome[] => {
    const currentMode = oddsMode || contestRef.current.oddsMode || 'auto';
    return outcomes.map(o => {
      const percentage = totalPool > 0 ? (o.totalBet / totalPool) * 100 : 0;
      let odds: number;
      if (currentMode === 'manual') {
        odds = o.manualOdds ?? o.odds ?? 2.0;
      } else {
        odds = o.totalBet > 0 ? Math.max(1.05, totalPool / o.totalBet) : (o.manualOdds ?? 1.0);
      }
      return { ...o, percentage, odds };
    });
  };

  const handleToggleOddsMode = (mode?: OddsMode) => {
    setContest(prev => {
      const nextMode: OddsMode = mode || (prev.oddsMode === 'manual' ? 'auto' : 'manual');
      const withOdds = recalculateOdds(prev.outcomes, prev.totalPool, nextMode);
      return {
        ...prev,
        oddsMode: nextMode,
        outcomes: withOdds
      };
    });
    soundEffects.playTokenClink();
  };

  // Place a bet on an outcome
  const handleBet = useCallback((userId: string, amount: number, outcomeId: string) => {
    const currentContest = contestRef.current;
    const currentUsers = usersRef.current;

    if (currentContest.status !== 'open' || amount <= 0) return;

    const user = currentUsers.find(u => u.id === userId);
    if (!user || user.tokens < amount) return;

    const targetOutcome = currentContest.outcomes.find(o => o.id === outcomeId);
    if (!targetOutcome || targetOutcome.isLocked) return;
    const outcomeName = targetOutcome.name || 'Contest';
    const outcomeColor = targetOutcome.color || '#6366f1';

    // Track user cumulative bet on this outcome to detect auto-merges
    // (e.g. 99 tokens dropped then 1 more -> becomes a single silver token!)
    const betKey = `${userId}_${outcomeId}`;
    const prevAccumulated = userBetAccumulatorRef.current.get(betKey) || 0;
    const newAccumulated = prevAccumulated + amount;
    userBetAccumulatorRef.current.set(betKey, newAccumulated);

    const isTierMerge = checkTierConsolidation(prevAccumulated, newAccumulated, tokenTiers);
    const areTokensEnabled = bucketConfig?.enableTokens !== false;

    if (areTokensEnabled) {
      // 1. Generate Drop Event for 2D/3D physics
      const event = isTierMerge
        ? breakdownBet(
          newAccumulated,
          user.id,
          user.name,
          user.config,
          silverThreshold,
          goldThreshold,
          outcomeId,
          outcomeName,
          outcomeColor,
          true,
          tokenTiers
        )
        : breakdownBet(
          amount,
          user.id,
          user.name,
          user.config,
          silverThreshold,
          goldThreshold,
          outcomeId,
          outcomeName,
          outcomeColor,
          false,
          tokenTiers
        );

      event.userAccumulatedAmount = newAccumulated;
      setLastDrop(event);
      soundEffects.playBetDrop();
    } else {
      soundEffects.playTokenClink();
    }

    // 2. Add Floating Notification (capped to last 6 items)
    const notif: FloatingNotification = {
      id: `drop_${Date.now()}_${Math.random()}`,
      type: 'drop',
      userName: user.name,
      userEmoji: user.config.emoji,
      amount,
      outcomeName,
      timestamp: Date.now(),
    };
    setFloatingNotifications(prev => [
      ...prev.slice(-5),
      notif
    ]);

    // Live sync token drop and notification to OBS overlay (only authoritative broadcaster broadcasts)
    if (uiMode === 'full') {
      broadcastStreamSync('TOKEN_DROP_EVENT', {
        dropEvent: event,
        notification: notif,
      });
    }

    // 3. Update User Balance (exact single deduction & immediate ref sync)
    setUsers(prevUsers => {
      const nextUsers = prevUsers.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            tokens: u.tokens - amount,
            lastOutcomeId: outcomeId
          };
        }
        return u;
      });
      usersRef.current = nextUsers;
      return nextUsers;
    });

    // 4. Update Contest Total Pool & Odds (exact single update)
    setContest(prevContest => {
      const nextPool = prevContest.totalPool + amount;
      const updatedOutcomes = prevContest.outcomes.map(o => {
        if (o.id === outcomeId) {
          return {
            ...o,
            totalBet: o.totalBet + amount,
            bettorCount: o.bettorCount + 1,
          };
        }
        return o;
      });

      const withOdds = recalculateOdds(updatedOutcomes, nextPool);

      return {
        ...prevContest,
        totalPool: nextPool,
        outcomes: withOdds,
        bets: [
          ...prevContest.bets.slice(-199),
          {
            id: `b_${Date.now()}_${Math.random()}`,
            userId: user.id,
            userName: user.name,
            outcomeId,
            outcomeName,
            amount,
            timestamp: Date.now(),
          }
        ]
      };
    });
  }, [silverThreshold, goldThreshold]);

  handleBetRef.current = handleBet;

  // Live Twitch Chat Integration listener
  useEffect(() => {
    const twitchCfg = twitchChatService.getConfig();
    if (twitchCfg.autoConnect && twitchCfg.channel) {
      twitchChatService.connect();
    }

    // 1. Live Chat Bet Command (!bet)
    const unsubscribeBet = twitchChatService.onBetCommand((cmd) => {
      const curContest = contestRef.current;
      if (curContest.status !== 'open') return;

      const cleanTarget = cmd.targetOutcome.trim().toLowerCase();
      const compactTarget = cleanTarget.replace(/[^a-z0-9]/g, '');

      const foundOutcome = curContest.outcomes.find(o => {
        if (o.isLocked) return false;
        const numStr = String(o.number);
        const nameLower = o.name.toLowerCase();
        const compactName = nameLower.replace(/[^a-z0-9]/g, '');

        return (
          numStr === cleanTarget ||
          numStr === compactTarget ||
          o.id.toLowerCase() === cleanTarget ||
          nameLower === cleanTarget ||
          nameLower.includes(cleanTarget) ||
          compactName === compactTarget ||
          (compactTarget.length >= 3 && compactName.includes(compactTarget))
        );
      });
      if (!foundOutcome) return;

      const curUsers = usersRef.current;
      let user = curUsers.find(u =>
        u.name.toLowerCase() === cmd.username.toLowerCase() ||
        u.name.toLowerCase() === cmd.displayName.toLowerCase() ||
        u.id.toLowerCase() === `twitch_${cmd.username.toLowerCase()}`
      );

      if (!user) {
        const startingTokens = twitchChatService.getConfig().startingTokens || 50000;
        const newUser: UserRosterItem = {
          id: `twitch_${cmd.username.toLowerCase()}`,
          name: cmd.displayName || cmd.username,
          tokens: startingTokens,
          currentBetInput: '200',
          config: {
            ...defaultTokenConfig,
            ...(cmd.color ? { colorTint: cmd.color } : {})
          },
          isMockUser: false,
        };
        user = newUser;
        const nextUsers = [...curUsers, newUser];
        usersRef.current = nextUsers;
        setUsers(nextUsers);
      }

      let betAmount = cmd.amount;
      if (cmd.isAllIn) {
        betAmount = user.tokens;
      } else if (user.tokens < betAmount) {
        betAmount = user.tokens;
      }

      if (betAmount > 0) {
        handleBet(user.id, betAmount, foundOutcome.id);
      }
    });

    // 2. Live Chat Join Command (!join) - Viewers appear in sidebar without placing a bet
    const unsubscribeJoin = twitchChatService.onJoinCommand((cmd) => {
      const curUsers = usersRef.current;
      const existingUser = curUsers.find(u =>
        u.name.toLowerCase() === cmd.username.toLowerCase() ||
        u.name.toLowerCase() === cmd.displayName.toLowerCase() ||
        u.id.toLowerCase() === `twitch_${cmd.username.toLowerCase()}`
      );

      if (existingUser) return;

      const startingTokens = twitchChatService.getConfig().startingTokens || 50000;
      const newUser: UserRosterItem = {
        id: `twitch_${cmd.username.toLowerCase()}`,
        name: cmd.displayName || cmd.username,
        tokens: startingTokens,
        currentBetInput: '200',
        config: {
          ...defaultTokenConfig,
          ...(cmd.color ? { colorTint: cmd.color } : {})
        },
        isMockUser: false,
      };

      const nextUsers = [...curUsers, newUser];
      usersRef.current = nextUsers;
      setUsers(nextUsers);
      soundEffects.playTokenClink();

      setFloatingNotifications(prev => [
        ...prev.slice(-5),
        {
          id: `join_${Date.now()}_${Math.random()}`,
          type: 'join',
          userName: newUser.name,
          userEmoji: newUser.config.emoji,
          amount: startingTokens,
          timestamp: Date.now(),
        }
      ]);
    });

    // 3. Live Chat Leave Command (!leave) - Viewers remove themselves from the active sidebar roster
    const unsubscribeLeave = twitchChatService.onLeaveCommand((cmd) => {
      const curUsers = usersRef.current;
      const userToRemove = curUsers.find(u =>
        u.name.toLowerCase() === cmd.username.toLowerCase() ||
        u.name.toLowerCase() === cmd.displayName.toLowerCase() ||
        u.id.toLowerCase() === `twitch_${cmd.username.toLowerCase()}`
      );

      if (!userToRemove) return;

      const nextUsers = curUsers.filter(u => u.id !== userToRemove.id);
      usersRef.current = nextUsers;
      setUsers(nextUsers);
      soundEffects.playCashout();

      setFloatingNotifications(prev => [
        ...prev.slice(-5),
        {
          id: `leave_${Date.now()}_${Math.random()}`,
          type: 'leave',
          userName: userToRemove.name,
          userEmoji: userToRemove.config.emoji,
          amount: userToRemove.tokens,
          timestamp: Date.now(),
        }
      ]);
    });

    // 4. Broadcaster & Moderator Admin Commands (!lock, !open, !reset, !give, !odds)
    const unsubscribeAdmin = twitchChatService.onAdminCommand((cmd) => {
      if (cmd.command === 'lock') {
        lockBetsRef.current();
      } else if (cmd.command === 'open') {
        reopenBetsRef.current();
      } else if (cmd.command === 'reset') {
        resetContestRef.current();
      } else if (cmd.command === 'give' && cmd.targetUser && cmd.amount) {
        const curUsers = usersRef.current;
        const targetLower = cmd.targetUser.toLowerCase();
        const existing = curUsers.find(u =>
          u.name.toLowerCase() === targetLower ||
          u.id.toLowerCase() === `twitch_${targetLower}`
        );
        if (existing) {
          updateUserPointsRef.current(existing.id, existing.tokens + cmd.amount);
        } else {
          const newUser: UserRosterItem = {
            id: `twitch_${targetLower}`,
            name: cmd.targetUser,
            tokens: cmd.amount,
            currentBetInput: '200',
            config: { ...defaultTokenConfig },
            isMockUser: false,
          };
          const nextUsers = [...curUsers, newUser];
          usersRef.current = nextUsers;
          setUsers(nextUsers);
          soundEffects.playTokenClink();
        }
      } else if (cmd.command === 'odds' && cmd.targetOutcome && cmd.oddsValue) {
        const searchTarget = cmd.targetOutcome.toLowerCase();
        setContest(prev => ({
          ...prev,
          oddsMode: 'manual',
          outcomes: prev.outcomes.map(o => {
            if (
              String(o.number) === searchTarget ||
              o.name.toLowerCase() === searchTarget ||
              o.name.toLowerCase().includes(searchTarget)
            ) {
              return {
                ...o,
                manualOdds: cmd.oddsValue,
                odds: cmd.oddsValue!
              };
            }
            return o;
          })
        }));
        soundEffects.playTokenClink();
      }
    });

    return () => {
      unsubscribeBet();
      unsubscribeJoin();
      unsubscribeLeave();
      unsubscribeAdmin();
    };
  }, [defaultTokenConfig, handleBet]);

  // Update an individual viewer's points arbitrarily
  const handleUpdateUserPoints = (userId: string, points: number) => {
    const clamped = Math.max(0, points);
    setUsers(prev => {
      const next = prev.map(u => u.id === userId ? { ...u, tokens: clamped } : u);
      usersRef.current = next;
      return next;
    });
    soundEffects.playTokenClink();
  };
  updateUserPointsRef.current = handleUpdateUserPoints;

  // House Bet on Outcome (Streamer / GM bet on a specific horse)
  const handleHouseBetOnOutcome = (outcomeId: string, customAmount?: number) => {
    const curContest = contestRef.current;
    if (curContest.status !== 'open') return;

    const targetOutcome = curContest.outcomes.find(o => o.id === outcomeId);
    if (!targetOutcome || targetOutcome.isLocked) return;

    const amount = customAmount && customAmount > 0 ? customAmount : (houseConfig.betAmount || 500);
    const houseName = houseConfig.name || 'The House';
    const houseEmoji = houseConfig.emoji || '🏛️';

    // 1. Generate Drop Event for 2D/3D physics
    const houseTokenConfig: UserTokenConfig = {
      emoji: houseEmoji,
      metalness: 0.85,
      roughness: 0.15,
      colorTint: '#f59e0b',
      finish: 'chrome',
      customLabel: houseName
    };

    const areTokensEnabled = bucketConfig?.enableTokens !== false;
    if (areTokensEnabled) {
      const event = breakdownBet(
        amount,
        'house',
        houseName,
        houseTokenConfig,
        silverThreshold,
        goldThreshold,
        outcomeId,
        targetOutcome.name || 'Contest',
        targetOutcome.color || '#f59e0b',
        false,
        tokenTiers
      );

      setLastDrop(event);
      soundEffects.playBetDrop();
    } else {
      soundEffects.playTokenClink();
    }

    // 2. Add Floating Notification
    const notif: FloatingNotification = {
      id: `drop_house_${Date.now()}_${Math.random()}`,
      type: 'drop',
      userName: houseName,
      userEmoji: houseEmoji,
      amount,
      outcomeName: targetOutcome.name,
      timestamp: Date.now(),
    };
    setFloatingNotifications(prev => [
      ...prev.slice(-5),
      notif
    ]);

    broadcastStreamSync('TOKEN_DROP_EVENT', {
      dropEvent: event,
      notification: notif,
    });

    // 3. Update Contest Total Pool & Odds (does NOT deduct from any viewer)
    setContest(prevContest => {
      const nextPool = prevContest.totalPool + amount;
      const updatedOutcomes = prevContest.outcomes.map(o => {
        if (o.id === outcomeId) {
          return {
            ...o,
            totalBet: o.totalBet + amount,
            bettorCount: o.bettorCount + 1,
          };
        }
        return o;
      });

      const withOdds = recalculateOdds(updatedOutcomes, nextPool);

      return {
        ...prevContest,
        totalPool: nextPool,
        outcomes: withOdds,
        bets: [
          ...prevContest.bets,
          {
            id: `b_house_${Date.now()}_${Math.random()}`,
            userId: 'house',
            userName: houseName,
            outcomeId,
            outcomeName: targetOutcome.name,
            amount,
            timestamp: Date.now(),
          }
        ]
      };
    });
  };

  // Add points directly to the overall pot (Seeded prize pool)
  const handleAddDirectPot = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    const houseName = houseConfig.name || 'The House';

    // 1. Generate Drop Event with high-tier prize token into the bucket
    const prizeTokenConfig: UserTokenConfig = {
      emoji: '🏆',
      metalness: 0.9,
      roughness: 0.1,
      colorTint: '#f59e0b',
      finish: 'gem',
      customLabel: 'Prize Pool'
    };

    const areTokensEnabled = bucketConfig?.enableTokens !== false;
    let event: DropEvent | undefined;

    if (areTokensEnabled) {
      event = breakdownBet(
        amount,
        'house_pot',
        houseName,
        prizeTokenConfig,
        silverThreshold,
        goldThreshold,
        'pot',
        reason || 'Prize Pool',
        '#f59e0b',
        false,
        tokenTiers
      );

      setLastDrop(event);
    }
    soundEffects.playCashout();

    // 2. Add Floating Notification
    const notif: FloatingNotification = {
      id: `pot_${Date.now()}_${Math.random()}`,
      type: 'drop',
      userName: houseName,
      userEmoji: '🎁',
      amount,
      outcomeName: 'Overall Prize Pool',
      timestamp: Date.now(),
    };
    setFloatingNotifications(prev => [
      ...prev.slice(-5),
      notif
    ]);

    if (event) {
      broadcastStreamSync('TOKEN_DROP_EVENT', {
        dropEvent: event,
        notification: notif,
        isPot: true,
      });
    }

    // 3. Update Contest Total Pool & recalculate Odds for all horses
    setContest(prevContest => {
      const nextPool = prevContest.totalPool + amount;
      const nextInitialPrizePool = (prevContest.initialPrizePool || 0) + amount;
      const withOdds = recalculateOdds(prevContest.outcomes, nextPool);

      return {
        ...prevContest,
        totalPool: nextPool,
        initialPrizePool: nextInitialPrizePool,
        outcomes: withOdds,
        bets: [
          ...prevContest.bets,
          {
            id: `b_prize_${Date.now()}_${Math.random()}`,
            userId: 'house_pot',
            userName: `${houseName} (Prize Pool)`,
            outcomeId: 'overall_pot',
            outcomeName: 'Overall Prize Pool',
            amount,
            timestamp: Date.now(),
          }
        ]
      };
    });
  };

  // Quick Bet on Outcome (House bet)
  const handleQuickBetOnOutcome = (outcomeId: string) => {
    handleHouseBetOnOutcome(outcomeId);
  };

  // Crown Winner & Calculate Payouts (supports 1st, 2nd, 3rd place podium)
  const handleSelectWinner = (outcomeId: string, customPodiumIds?: string[]) => {
    const currentContest = contestRef.current;
    const currentUsers = usersRef.current;

    // Determine the ordered podium outcome IDs (e.g. [1st, 2nd, 3rd] or [1st])
    const podiumIds = (customPodiumIds && customPodiumIds.length > 0)
      ? customPodiumIds
      : [outcomeId];

    const winningOutcome = currentContest.outcomes.find(o => o.id === podiumIds[0]);
    if (!winningOutcome) return;

    const totalPool = currentContest.totalPool;

    // Find all placed BetOutcome objects
    const placedOutcomes = podiumIds
      .map(id => currentContest.outcomes.find(o => o.id === id))
      .filter((o): o is BetOutcome => Boolean(o));

    // Base share distribution percentages (handles 1, 2, 3, 4, 5, 6... arbitrary N victors)
    const N = placedOutcomes.length;
    let baseShares: number[];
    if (N <= 1) {
      baseShares = [1.0];
    } else if (N === 2) {
      baseShares = [0.70, 0.30];
    } else if (N === 3) {
      baseShares = [0.60, 0.25, 0.15];
    } else if (N === 4) {
      baseShares = [0.50, 0.25, 0.15, 0.10];
    } else if (N === 5) {
      baseShares = [0.42, 0.24, 0.16, 0.11, 0.07];
    } else if (N === 6) {
      baseShares = [0.38, 0.22, 0.16, 0.11, 0.08, 0.05];
    } else {
      const raw = Array.from({ length: N }, (_, i) => 1 / Math.pow(i + 1, 0.95));
      const sum = raw.reduce((a, b) => a + b, 0);
      baseShares = raw.map(w => w / sum);
    }

    // Check which placed outcomes actually had bets placed on them
    // If a placed horse has 0 bets, redistribute its share proportionally among those with bets
    const totalActiveBaseWeight = placedOutcomes.reduce((sum, outcome, idx) => {
      return outcome.totalBet > 0 ? sum + (baseShares[idx] || 0) : sum;
    }, 0);

    const podiumOutcomesData = placedOutcomes.map((outcome, idx) => {
      const placeNum = idx + 1;
      let shareFraction = 0;
      if (totalActiveBaseWeight > 0 && outcome.totalBet > 0) {
        shareFraction = (baseShares[idx] || 0) / totalActiveBaseWeight;
      } else if (totalActiveBaseWeight === 0) {
        shareFraction = baseShares[idx] || 0;
      }

      const poolShare = Math.round(totalPool * shareFraction);
      const isManualMode = currentContest.oddsMode === 'manual';
      const oddsMultiplier = isManualMode
        ? (outcome.manualOdds ?? outcome.odds ?? 2.0)
        : (outcome.totalBet > 0 ? (poolShare / outcome.totalBet) : 1.0);

      return {
        outcome,
        place: placeNum,
        poolShare,
        sharePct: Math.round(shareFraction * 100),
        bettorCount: outcome.bettorCount,
        oddsMultiplier
      };
    });

    const winningPool = winningOutcome.totalBet;
    const overallOddsMultiplier = currentContest.oddsMode === 'manual'
      ? (winningOutcome.manualOdds || winningOutcome.odds || 2.0)
      : (winningPool > 0 ? (totalPool / winningPool) : 1.0);

    // Aggregate bets by user and outcome
    const userBetsMap: Record<string, Record<string, number>> = {};
    for (const b of currentContest.bets) {
      if (b.outcomeId === 'overall_pot') continue; // Seeded prize pool is distributed via totalPool
      if (!userBetsMap[b.userId]) {
        userBetsMap[b.userId] = {};
      }
      userBetsMap[b.userId][b.outcomeId] = (userBetsMap[b.userId][b.outcomeId] || 0) + b.amount;
    }

    const winners: WinCelebrationData['winners'] = [];
    const losers: WinCelebrationData['losers'] = [];

    for (const [uid, betsByOutcome] of Object.entries(userBetsMap)) {
      const u = currentUsers.find(usr => usr.id === uid);
      // In live mode (!isDebugMode), filter out mock users from win celebration and podium results
      if (!isDebugMode && u?.isMockUser) {
        continue;
      }
      const isHouseUser = uid === 'house';
      const betUser = currentContest.bets.find(b => b.userId === uid);
      const uName = isHouseUser ? (houseConfig.name || 'The House') : (u?.name || betUser?.userName || 'Viewer');
      const uConfig = isHouseUser
        ? { emoji: houseConfig.emoji || '🏛️', metalness: 0.85, roughness: 0.15, colorTint: '#f59e0b' }
        : (u?.config || { emoji: '🪙', metalness: 0.5, roughness: 0.5 });

      for (const [outId, betAmount] of Object.entries(betsByOutcome)) {
        const placeIdx = podiumIds.indexOf(outId);
        if (placeIdx !== -1) {
          // Bet placed on a podium winner
          const placeNum = placeIdx + 1;
          const podData = podiumOutcomesData[placeIdx];
          const horse = podData?.outcome;
          let payout: number;
          if (currentContest.oddsMode === 'manual') {
            const fixedOdds = horse?.manualOdds || horse?.odds || 2.0;
            if (placeNum === 1) {
              payout = Math.max(betAmount, Math.round(betAmount * fixedOdds));
            } else {
              const profitMultiplier = Math.max(0, fixedOdds - 1);
              const rankShare = baseShares[placeIdx] && baseShares[0] ? (baseShares[placeIdx] / baseShares[0]) : 0.5;
              const placeMultiplier = 1 + (profitMultiplier * rankShare);
              payout = Math.max(betAmount, Math.round(betAmount * placeMultiplier));
            }
          } else {
            payout = podData && podData.poolShare > 0 && horse && horse.totalBet > 0
              ? Math.max(betAmount, Math.round(betAmount * (podData.poolShare / horse.totalBet)))
              : betAmount;
          }

          winners.push({
            userId: uid,
            userName: uName,
            betAmount,
            payout,
            place: placeNum,
            outcomeName: horse?.name || winningOutcome.name,
            config: uConfig,
          });
        } else {
          // Bet on non-winning entrant
          losers.push({
            userId: uid,
            userName: uName,
            betAmount,
          });
        }
      }
    }

    winners.sort((a, b) => (a.place || 1) - (b.place || 1) || b.payout - a.payout);

    const celebration: WinCelebrationData = {
      winningOutcome,
      podiumOutcomes: podiumOutcomesData,
      totalPool,
      winningPool,
      oddsMultiplier: overallOddsMultiplier,
      winners,
      losers,
    };

    setCelebrationData(celebration);
    setIsCelebrationOpen(true);
    setIsWinnerBurst(true);
    setJostleTrigger(p => p + 1);

    broadcastStreamSync('WINNER_CELEBRATION', {
      celebrationData: celebration,
      isOpen: true,
      isWinnerBurst: true,
    });

    setContest(prev => ({
      ...prev,
      status: 'resolved',
      winningOutcomeId: winningOutcome.id,
      podiumOutcomeIds: podiumIds,
      expectedWinnersCount: podiumIds.length,
      resolvedAt: Date.now(),
    }));

    setTimeout(() => setIsWinnerBurst(false), 3000);
  };

  // Confirm and distribute payouts to viewers
  const handleConfirmPayouts = () => {
    if (!celebrationData) return;

    const { winners, losers, winningOutcome } = celebrationData;

    // Aggregate total win payouts and best place per user
    const userWinsMap: Record<string, { totalPayout: number; bestPlace: number; outcomeName: string }> = {};
    for (const w of winners) {
      if (!userWinsMap[w.userId]) {
        userWinsMap[w.userId] = {
          totalPayout: 0,
          bestPlace: w.place || 1,
          outcomeName: w.outcomeName || winningOutcome.name
        };
      }
      userWinsMap[w.userId].totalPayout += w.payout;
      if (w.place && w.place < userWinsMap[w.userId].bestPlace) {
        userWinsMap[w.userId].bestPlace = w.place;
        userWinsMap[w.userId].outcomeName = w.outcomeName || winningOutcome.name;
      }
    }

    // Aggregate loss amounts per user
    const userLossesMap: Record<string, number> = {};
    for (const l of losers) {
      userLossesMap[l.userId] = (userLossesMap[l.userId] || 0) + l.betAmount;
    }

    setUsers(prevUsers => {
      return prevUsers.map(u => {
        const winData = userWinsMap[u.id];
        if (winData) {
          return {
            ...u,
            tokens: u.tokens + winData.totalPayout,
            lastResult: {
              type: 'win',
              amount: winData.totalPayout,
              outcomeName: winData.outcomeName,
              timestamp: Date.now(),
              place: winData.bestPlace
            }
          };
        }

        const loseAmount = userLossesMap[u.id];
        if (loseAmount) {
          return {
            ...u,
            lastResult: {
              type: 'lose',
              amount: loseAmount,
              outcomeName: winningOutcome.name,
              timestamp: Date.now()
            }
          };
        }

        return u;
      });
    });

    const newNotifications: FloatingNotification[] = [];

    // Distinct top winners for notifications
    const notifiedUserIds = new Set<string>();
    winners.forEach((win, i) => {
      if (notifiedUserIds.size < 4 && !notifiedUserIds.has(win.userId)) {
        notifiedUserIds.add(win.userId);
        const medal = win.place === 1 ? '🥇 ' : win.place === 2 ? '🥈 ' : win.place === 3 ? '🥉 ' : (win.place ? `#${win.place} ` : '');
        newNotifications.push({
          id: `win_${Date.now()}_${i}`,
          type: 'win',
          userName: `${medal}${win.userName}`,
          userEmoji: win.config.emoji,
          amount: win.payout,
          outcomeName: win.outcomeName || winningOutcome.name,
          timestamp: Date.now() + i * 200,
        });
      }
    });

    losers.slice(0, 2).forEach((lose, i) => {
      newNotifications.push({
        id: `lose_${Date.now()}_${i}`,
        type: 'lose',
        userName: lose.userName,
        userEmoji: '💀',
        amount: lose.betAmount,
        timestamp: Date.now() + i * 300,
      });
    });

    setFloatingNotifications(prev => [...prev, ...newNotifications]);
    soundEffects.playCashout();

    // Trigger trapdoor in physics bucket so tokens fall through bottom off-screen
    setIsBucketTrapdoorOpen(true);
    setJostleTrigger(p => p + 1);
    broadcastStreamSync('TRAPDOOR_EVENT', { open: true });
    broadcastStreamSync('CLOSE_CELEBRATION', {});
    broadcastStreamSync('FLOATING_NOTIFICATIONS', { notifications: newNotifications });

    setTimeout(() => {
      setIsBucketTrapdoorOpen(false);
      // Trip physics switch when floor closes to rejostle and re-settle any tokens remaining in the hopper
      setJostleTrigger(p => p + 1);
      broadcastStreamSync('TRAPDOOR_EVENT', { open: false });
    }, 3800);

    // Audio tally ticking as viewer balances increase
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      soundEffects.playTallyTick();
      tickCount++;
      if (tickCount >= 10) clearInterval(tickInterval);
    }, 120);
  };

  // Lock bets action (with buzzer + dopamine shine effect)
  const handleLockBets = () => {
    setContest(prev => ({ ...prev, status: 'locked' }));
    soundEffects.playLockBuzzer();
    soundEffects.playShineSound();
    setIsLockedShineActive(true);
    setTimeout(() => setIsLockedShineActive(false), 1400);
  };

  // Reopen bets action
  const handleReopenBets = () => {
    setContest(prev => ({ ...prev, status: 'open' }));
    soundEffects.playCashout();
  };
  lockBetsRef.current = handleLockBets;
  reopenBetsRef.current = handleReopenBets;

  // Horse Editor Handlers (Centralized Popup Window)
  const handleSaveHorse = (horseData: { id?: string; name: string; number: number; color: string; icon: string; manualOdds?: number; odds?: number }) => {
    if (horseData.id) {
      setContest(prev => ({
        ...prev,
        outcomes: prev.outcomes.map(o => {
          if (o.id === horseData.id) {
            const mOdds = horseData.manualOdds ?? o.manualOdds ?? 2.0;
            return {
              ...o,
              name: horseData.name,
              number: horseData.number,
              color: horseData.color,
              icon: horseData.icon,
              manualOdds: mOdds,
              odds: prev.oddsMode === 'manual' ? mOdds : (o.totalBet > 0 ? o.odds : mOdds)
            };
          }
          return o;
        })
      }));
    } else {
      const initialOdds = horseData.manualOdds ?? 2.0;
      const newOutcome: BetOutcome = {
        id: String(Date.now()),
        number: horseData.number,
        name: horseData.name,
        color: horseData.color,
        icon: horseData.icon,
        totalBet: 0,
        bettorCount: 0,
        odds: initialOdds,
        manualOdds: initialOdds,
        percentage: 0,
        isLocked: false
      };
      setContest(prev => ({
        ...prev,
        outcomes: [...prev.outcomes, newOutcome]
      }));
    }
    soundEffects.playTokenClink();
  };

  const handleRemoveEntrantById = (id: string) => {
    setContest(prev => ({
      ...prev,
      outcomes: prev.outcomes.filter(o => o.id !== id).map((o, idx) => ({ ...o, number: idx + 1 }))
    }));
    soundEffects.playTokenClink();
  };

  // Bulk Import entrant names (Replace or Append)
  const handleBulkImportHorses = (lines: string[], mode: 'replace' | 'append') => {
    if (lines.length === 0) return;

    const colors = [
      '#ef4444', '#f97316', '#eab308', '#10b981', '#14b8a6',
      '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
      '#f43f5e', '#a855f7', '#94a3b8', '#e2e8f0'
    ];
    const icons = ['🏇', '⚡', '⭐', '☄️', '🔥', '👑', '🦄', '🐎', '🎯', '🌑', '🏆', '🌪️', '💫', '💎'];

    if (mode === 'replace') {
      const outcomes: BetOutcome[] = lines.map((line, idx) => ({
        id: String(idx + 1),
        number: idx + 1,
        name: line,
        color: colors[idx % colors.length],
        icon: icons[idx % icons.length] || '🏇',
        totalBet: 0,
        bettorCount: 0,
        odds: 2.0,
        manualOdds: 2.0,
        percentage: 0,
        isLocked: false,
      }));

      setContest(prev => ({
        ...prev,
        outcomes,
        totalPool: 0,
        status: 'open',
        winningOutcomeId: undefined,
        bets: []
      }));
    } else {
      const startNum = contest.outcomes.length;
      const newOutcomes: BetOutcome[] = lines.map((line, idx) => ({
        id: String(Date.now() + idx),
        number: startNum + idx + 1,
        name: line,
        color: colors[(startNum + idx) % colors.length],
        icon: icons[(startNum + idx) % icons.length] || '🏇',
        totalBet: 0,
        bettorCount: 0,
        odds: 2.0,
        manualOdds: 2.0,
        percentage: 0,
        isLocked: false,
      }));

      setContest(prev => ({
        ...prev,
        outcomes: [...prev.outcomes, ...newOutcomes]
      }));
    }

    const newCascadeKey = Date.now();
    setPresetCascadeKey(newCascadeKey);
    broadcastStreamSync('CASCADE_ANIMATION', { key: newCascadeKey });
    soundEffects.playTokenClink();
  };

  // Reset contest for next race/round
  const handleResetContest = () => {
    userBetAccumulatorRef.current.clear();
    setCelebrationData(null);
    setIsCelebrationOpen(false);
    setIsWinnerBurst(false);
    setUsers(prev => prev.map(u => ({ ...u, lastResult: undefined })));
    const defaultSeed = houseConfig.defaultPrizePool || 0;
    setContest(prev => ({
      ...prev,
      status: 'open',
      totalPool: defaultSeed,
      initialPrizePool: defaultSeed,
      winningOutcomeId: undefined,
      podiumOutcomeIds: [],
      bets: defaultSeed > 0 ? [
        {
          id: `b_prize_${Date.now()}_${Math.random()}`,
          userId: 'house_pot',
          userName: `${houseConfig.name || 'The House'} (Prize Pool)`,
          outcomeId: 'overall_pot',
          outcomeName: 'Overall Prize Pool',
          amount: defaultSeed,
          timestamp: Date.now(),
        }
      ] : [],
      outcomes: prev.outcomes.map(o => ({
        ...o,
        totalBet: 0,
        bettorCount: 0,
        odds: prev.oddsMode === 'manual' ? (o.manualOdds ?? o.odds ?? 2.0) : (o.manualOdds ?? 1.0),
        percentage: 0
      }))
    }));

    setOnResetTrigger(prev => prev + 1);
    soundEffects.playTokenClink();
    const newCascadeKey = Date.now();
    setPresetCascadeKey(newCascadeKey);
    broadcastStreamSync('CASCADE_ANIMATION', { key: newCascadeKey });
    broadcastStreamSync('RESET_CONTEST', { key: newCascadeKey });
  };
  resetContestRef.current = handleResetContest;

  // Apply Race Preset & Trigger Cascade Filing-In Animation
  const handleApplyPreset = (title: string, outcomes: BetOutcome[], presetPanelsConfig?: Partial<PanelsConfig>) => {
    userBetAccumulatorRef.current.clear();
    setCelebrationData(null);
    setIsCelebrationOpen(false);
    setIsWinnerBurst(false);
    setUsers(prev => prev.map(u => ({ ...u, lastResult: undefined })));
    setContest(prev => ({
      ...prev,
      id: `c_${Date.now()}`,
      title,
      outcomes,
      totalPool: 0,
      status: 'open',
      winningOutcomeId: undefined,
      podiumOutcomeIds: [],
      bets: [],
      createdAt: Date.now(),
    }));

    if (presetPanelsConfig) {
      setPanelsConfig(prev => {
        const updated = {
          ...prev,
          ...presetPanelsConfig,
        };
        storageService.savePanelsConfig(updated);
        return updated;
      });
    }

    const newCascadeKey = Date.now();
    setPresetCascadeKey(newCascadeKey);
    broadcastStreamSync('CASCADE_ANIMATION', { key: newCascadeKey });
  };

  // Clear Arena Tokens
  const handleClearArena = () => {
    userBetAccumulatorRef.current.clear();
    setOnResetTrigger(p => p + 1);
    soundEffects.playTokenClink();
    broadcastStreamSync('CLEAR_ARENA', {});
  };

  // Instant 1-Click "Condense Pile" for all viewer tokens in bucket
  const handleCondensePile = () => {
    setCondenseTrigger(p => p + 1);
    setJostleTrigger(p => p + 1);
    soundEffects.playCashout();
    broadcastStreamSync('CONDENSE_PILE', {});
  };

  // Chat Simulation Engine
  const handleSimulateRandomBets = (count: number) => {
    if (contestRef.current.status !== 'open') return;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const curUsers = usersRef.current;
        const curContest = contestRef.current;
        const activeOutcomes = curContest.outcomes.filter(o => !o.isLocked);
        if (curUsers.length === 0 || activeOutcomes.length === 0) return;

        const randomUser = curUsers[Math.floor(Math.random() * curUsers.length)];
        const randomOutcome = activeOutcomes[Math.floor(Math.random() * activeOutcomes.length)];
        const randomAmount = Math.floor(Math.random() * 8 + 1) * 50;

        if (randomUser && randomOutcome) {
          if (randomUser.tokens < randomAmount) {
            const refilledTokens = randomUser.tokens + 25000;
            randomUser.tokens = refilledTokens;
            setUsers(prev => {
              const next = prev.map(u => u.id === randomUser.id ? { ...u, tokens: refilledTokens } : u);
              usersRef.current = next;
              return next;
            });
          }
          handleBet(randomUser.id, randomAmount, randomOutcome.id);
        }
      }, i * 140);
    }
  };

  // Extreme Stress Test: 1,000 simulated viewers betting at 4 bets/sec (250ms cadence)
  const handleToggleSwarm = () => {
    if (isSwarmActive) {
      if (swarmIntervalRef.current) {
        clearInterval(swarmIntervalRef.current);
        swarmIntervalRef.current = null;
      }
      setIsSwarmActive(false);
      return;
    }

    if (contestRef.current.status !== 'open') return;

    // Seed up to 1,000 simulated viewers if fewer exist
    const curPool = usersRef.current;
    if (curPool.length < 1000) {
      const extraNeeded = 1000 - curPool.length;
      const emojis = ['🪙', '⚡', '⭐', '🔥', '👑', '💎', '🐎', '🎯', '🦄', '🏆', '💫', '🌪️', '🎲', '🌸', '✨', '🦊', '🐱', '🚀', '🔮', '🍀'];
      const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];
      const generated: UserRosterItem[] = [];
      const startNum = curPool.length + 1;

      for (let i = 0; i < extraNeeded; i++) {
        const num = startNum + i;
        generated.push({
          id: `u_swarm_${num}`,
          name: `Viewer_${String(num).padStart(4, '0')}`,
          tokens: 50000,
          currentBetInput: '200',
          config: {
            emoji: emojis[num % emojis.length],
            metalness: 0.8,
            roughness: 0.2,
            colorTint: colors[num % colors.length],
            finish: 'standard',
          },
          isMockUser: true,
        });
      }
      setUsers(prev => [...prev, ...generated]);
    }

    setIsSwarmActive(true);
    setSwarmCount(0);

    // 4 bets per second = 250ms interval
    swarmIntervalRef.current = setInterval(() => {
      const curUsers = usersRef.current;
      const curContest = contestRef.current;
      const activeOutcomes = curContest.outcomes.filter(o => !o.isLocked);
      if (curUsers.length === 0 || activeOutcomes.length === 0) return;

      const randomUser = curUsers[Math.floor(Math.random() * curUsers.length)];
      const randomOutcome = activeOutcomes[Math.floor(Math.random() * activeOutcomes.length)];
      const randomAmount = Math.floor(Math.random() * 8 + 1) * 50;

      if (randomUser && randomOutcome) {
        if (randomUser.tokens < randomAmount) {
          const refilledTokens = randomUser.tokens + 25000;
          randomUser.tokens = refilledTokens;
          setUsers(prev => {
            const next = prev.map(u => u.id === randomUser.id ? { ...u, tokens: refilledTokens } : u);
            usersRef.current = next;
            return next;
          });
        }
        handleBet(randomUser.id, randomAmount, randomOutcome.id);
        setSwarmCount(c => c + 1);
      }
    }, 250);
  };

  // Swarm cleanup on unmount or contest close
  useEffect(() => {
    if (contest.status !== 'open' && isSwarmActive) {
      if (swarmIntervalRef.current) {
        clearInterval(swarmIntervalRef.current);
        swarmIntervalRef.current = null;
      }
      setIsSwarmActive(false);
    }
  }, [contest.status, isSwarmActive]);

  useEffect(() => {
    return () => {
      if (swarmIntervalRef.current) {
        clearInterval(swarmIntervalRef.current);
      }
    };
  }, []);

  // Add viewer with persistent token prefs or default channel token
  const handleAddUser = (name: string, emoji?: string) => {
    const savedToken = storageService.getUserToken(name);
    const config = savedToken || (emoji ? { ...defaultTokenConfig, emoji } : defaultTokenConfig);

    const newUser: UserRosterItem = {
      id: `u_${Date.now()}`,
      name,
      tokens: 60000,
      currentBetInput: '200',
      config,
      isMockUser: false,
    };
    setUsers(prev => [...prev, newUser]);
    soundEffects.playTokenClink();
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Save modified token config from TokenMakerModal
  const handleSaveTokenConfig = (userId: string, newConfig: UserTokenConfig) => {
    if (userId === 'default_app_token') {
      setDefaultTokenConfig(newConfig);
      storageService.saveDefaultToken(newConfig);
      return;
    }

    if (userId === 'viewers_panel_icon') {
      setPanelsConfig(prev => {
        const updated = {
          ...prev,
          viewersEmoji: newConfig.emoji,
          viewersTokenConfig: newConfig,
        };
        storageService.savePanelsConfig(updated);
        return updated;
      });
      return;
    }

    if (userId === 'entrants_panel_icon') {
      setPanelsConfig(prev => {
        const updated = {
          ...prev,
          entrantsEmoji: newConfig.emoji,
          entrantsTokenConfig: newConfig,
        };
        storageService.savePanelsConfig(updated);
        return updated;
      });
      return;
    }

    if (userId === 'race_icon') {
      setPanelsConfig(prev => {
        const updated = {
          ...prev,
          raceEmoji: newConfig.emoji,
          raceTokenConfig: newConfig,
        };
        storageService.savePanelsConfig(updated);
        return updated;
      });
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        storageService.saveUserToken(u.name, newConfig);
        return { ...u, config: newConfig };
      }
      return u;
    }));
  };

  const handleUpdateViewersTitle = (title: string) => {
    setPanelsConfig(prev => {
      const updated = { ...prev, viewersTitle: title };
      storageService.savePanelsConfig(updated);
      return updated;
    });
  };

  const handleUpdateEntrantsTitle = (title: string) => {
    setPanelsConfig(prev => {
      const updated = { ...prev, entrantsTitle: title };
      storageService.savePanelsConfig(updated);
      return updated;
    });
  };

  const handleOpenViewersIconEditor = () => {
    setActiveTokenMakerUser({
      id: 'viewers_panel_icon',
      name: panelsConfig.viewersTitle || 'Viewers',
      tokens: 0,
      currentBetInput: '0',
      config: panelsConfig.viewersTokenConfig || {
        emoji: panelsConfig.viewersEmoji || '👥',
        metalness: 0.8,
        roughness: 0.2,
        finish: 'standard',
      },
    });
  };

  const handleOpenEntrantsIconEditor = () => {
    setActiveTokenMakerUser({
      id: 'entrants_panel_icon',
      name: panelsConfig.entrantsTitle || 'Entrants',
      tokens: 0,
      currentBetInput: '0',
      config: panelsConfig.entrantsTokenConfig || {
        emoji: panelsConfig.entrantsEmoji || '🏇',
        metalness: 0.8,
        roughness: 0.2,
        finish: 'standard',
      },
    });
  };

  const handleOpenRaceIconEditor = () => {
    setActiveTokenMakerUser({
      id: 'race_icon',
      name: contest.title || 'Race Contest',
      tokens: 0,
      currentBetInput: '0',
      config: panelsConfig.raceTokenConfig || {
        emoji: panelsConfig.raceEmoji || '🏆',
        metalness: 0.8,
        roughness: 0.2,
        finish: 'standard',
      },
    });
  };

  const handleOpenDefaultTokenEditor = () => {
    setActiveTokenMakerUser({
      id: 'default_app_token',
      name: 'Channel Default Token',
      tokens: 0,
      currentBetInput: '0',
      config: defaultTokenConfig,
    });
  };

  const handleToggleDebugMode = (enabled: boolean) => {
    setIsDebugMode(enabled);
    storageService.setDebugMode(enabled);
    if (!enabled) {
      // Clean up mock users' last results when exiting debug mode so they don't linger on live podium
      setUsers(prev => prev.map(u => u.isMockUser ? { ...u, lastResult: undefined } : u));
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEffects.setMuted(next);
    if (!next) soundEffects.playTokenClink();
  };

  const handleToggleContestStatus = () => {
    const nextStatus = contest.status === 'open' ? 'locked' : 'open';
    setContest(p => ({ ...p, status: nextStatus }));
    if (nextStatus === 'locked') soundEffects.playLockBuzzer();
    else soundEffects.playTokenClink();
  };

  const handleSetAllPoints = (amount: number) => {
    setUsers(prev => prev.map(u => ({ ...u, tokens: Math.max(0, amount) })));
    soundEffects.playCashout();
  };

  const handleAddPointsToAll = (amount: number) => {
    setUsers(prev => prev.map(u => ({ ...u, tokens: Math.max(0, u.tokens + amount) })));
    soundEffects.playTokenClink();
  };

  const handleClearAllPoints = () => {
    setUsers(prev => prev.map(u => ({ ...u, tokens: 0 })));
    soundEffects.playTokenClink();
  };

  // Handle ESC key to exit modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCelebrationOpen) setIsCelebrationOpen(false);
        if (activeTokenMakerUser) setActiveTokenMakerUser(null);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isViewerDrawerOpen) setIsViewerDrawerOpen(false);
        if (isViewControlsOpen) setIsViewControlsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCelebrationOpen, activeTokenMakerUser, isSettingsOpen, isViewerDrawerOpen, isViewControlsOpen]);

  const isOBSMode = uiMode === 'obs';

  return (
    <div className={`app-root ${isOBSMode ? 'obs-mode' : ''} ui-mode-${uiMode}`}>
      {/* Top Navbar */}
      {uiMode !== 'minimal' && uiMode !== 'viewer' && uiMode !== 'config' && (
        <header
          className={`app-topbar cosmos-panel ${isTopbarCompact ? 'topbar-stream-compact' : ''}`}
          onWheel={(e) => {
            if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <div className="topbar-branding">
            {isTopbarCompact ? (
              <div
                className="topbar-hero-icon-box"
                title="Tokenpile (Stream Mode)"
                style={{ width: '38px', height: '38px' }}
              >
                <img
                  src={styleService.getImage('tp_ico.png')}
                  alt="Tokenpile"
                  className="topbar-hero-icon-img"
                />
              </div>
            ) : (
              <div className="topbar-title-group">
                <h1 className="topbar-logo-title-wrap">
                  <img
                    src={styleService.getImage('tp_logo_long.png')}
                    alt="Tokenpile"
                    className="topbar-logo-img"
                  />
                </h1>
                <span className="logo-subtitle">A Token Visualization Engine By ILLOGICOMA</span>
              </div>
            )}
          </div>

          {/* Center: Contest Operations Command Center */}
          <div className="topbar-contest-center">
            {/* Status Badge */}
            <span className={`topbar-status-badge status-${contest.status}`}>
              {contest.status === 'open' && <span className="status-dot-pulse" />}
              {contest.status === 'locked' && <Lock size={12} color="#f59e0b" />}
              {contest.status === 'resolved' && <Trophy size={12} color="#fbbf24" />}
              <span>{contest.status.toUpperCase()}</span>
            </span>

            {/* Primary Action Controls */}
            <div className="topbar-contest-actions">
              {contest.status === 'open' ? (
                <button
                  className="cyber-nav-btn topbar-lock-btn"
                  onClick={() => {
                    if (!isAdmin) {
                      setIsAdminModalOpen(true);
                    } else {
                      handleLockBets();
                    }
                  }}
                  title={isAdmin ? "Lock bets before starting race" : "Admin Passcode required to lock bets"}
                >
                  <Lock size={13} color="currentColor" />
                  <span>Lock Bets</span>
                </button>
              ) : (
                <button
                  className="cyber-nav-btn topbar-reopen-btn"
                  onClick={() => {
                    if (!isAdmin) {
                      setIsAdminModalOpen(true);
                    } else {
                      handleReopenBets();
                    }
                  }}
                  title={isAdmin ? "Reopen bets" : "Admin Passcode required to reopen bets"}
                >
                  <Play size={13} color="currentColor" />
                  <span>Reopen Bets</span>
                </button>
              )}

              <button
                className="cyber-nav-btn"
                onClick={() => {
                  if (!isAdmin) {
                    setIsAdminModalOpen(true);
                  } else {
                    handleResetContest();
                  }
                }}
                title={isAdmin ? "Reset contest (clears pool & resets odds for next race)" : "Admin Passcode required to reset contest"}
              >
                <RotateCcw size={13} color="#94a3b8" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Stats: Pot & Horses */}
            <div className="topbar-stat-pill">
              <span className="stat-label">Pot:</span>
              <span className="stat-val">{contest.totalPool.toLocaleString()} pts</span>
            </div>

            <div className="topbar-stat-pill">
              <span className="stat-label">{panelsConfig.entrantsTitle || 'Entrants'}:</span>
              <span className="stat-val">{contest.outcomes.length}</span>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Unified Controls & Presets Container */}
            <div className="topbar-group-well topbar-system-group">
              {/* 1. Mute Audio */}
              <button
                className={`cyber-nav-btn btn-icon-only ${isMuted ? 'active-amber' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} color="#22c55e" />}
              </button>

              {/* 2. Alignment & Debug Guides Toggle (OBS Bound Guide + Bucket Guide at once) */}
              <button
                className={`cyber-nav-btn btn-icon-only btn-guides-toggle ${isDebugGuidesActive ? 'debug-toggle-on' : ''}`}
                onClick={handleToggleDebugGuides}
                title={
                  isDebugGuidesActive
                    ? 'Alignment & Debug Guides ON (OBS Stage Outline + Bucket Guide) — Click to hide'
                    : 'Show Alignment & Debug Guides (OBS Stage Outline + Bucket Guide at once)'
                }
              >
                <Tv size={15} color={isDebugGuidesActive ? '#fbbf24' : '#7D6B42'} />
              </button>

              {/* 3. Quick 2D / 3D Physics Engine Toggle */}
              <button
                className={`cyber-nav-btn btn-engine-toggle ${renderEngine === '3d' ? 'active-engine-3d' : 'active-engine-2d'}`}
                onClick={() => handleToggleRenderEngine(renderEngine === '2d' ? '3d' : '2d')}
                title={`Current Physics Engine: ${renderEngine.toUpperCase()}. Click to switch to ${renderEngine === '2d' ? '3D' : '2D'}`}
              >
                <Layers size={14} color={renderEngine === '3d' ? '#38bdf8' : '#d97706'} />
                <span className="engine-toggle-label">{renderEngine.toUpperCase()}</span>
              </button>

              {/* Jostle / Wake Stuck Tokens */}
              {bucketConfig.enableTokens !== false && (
                <button
                  className={`cyber-nav-btn btn-icon-only btn-jostle ${isJostling ? 'is-jostling' : ''}`}
                  onClick={handleJostleTokens}
                  title="Jostle Tokens (Trip physics switch & wake up resting/stuck tokens in the hopper)"
                >
                  <RefreshCw size={14} />
                </button>
              )}

              {/* 4. Bet Log & Audit History */}
              <button
                className={`cyber-nav-btn btn-bet-log ${isBetLogOpen ? 'active-amber' : ''}`}
                onClick={() => setIsBetLogOpen(prev => !prev)}
                title="Betting History & Log (View who bet on what)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
              >
                <FileText size={15} color={isBetLogOpen ? '#d97706' : '#7D6B42'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Log</span>
                {contest.bets.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-family-mono, monospace)',
                      background: isBetLogOpen ? '#78350f' : 'var(--accent-gold, #d97706)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '0.05rem 0.35rem',
                      lineHeight: 1.2,
                      fontWeight: 700,
                    }}
                  >
                    {contest.bets.length}
                  </span>
                )}
              </button>

              {/* Admin / GM Mode Lock & Unlock Badge */}
              <button
                className={`cyber-nav-btn btn-admin-badge ${isAdmin ? 'admin-badge-unlocked' : 'admin-badge-locked'}`}
                onClick={() => setIsAdminModalOpen(true)}
                title={isAdmin ? "Streamer GM Admin Controls Unlocked. Click to lock or manage passcode." : "Viewer Mode Active (Admin controls locked). Click to enter Streamer Passcode."}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderColor: isAdmin ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)',
                  backgroundColor: isAdmin ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'
                }}
              >
                {isAdmin ? <ShieldCheck size={15} color="#10b981" /> : <ShieldAlert size={15} color="#f59e0b" />}
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isAdmin ? '#10b981' : '#f59e0b' }}>
                  {isAdmin ? 'GM' : 'Viewer'}
                </span>
              </button>

              {/* 5. Settings (Icon Only) */}
              <button
                className="cyber-nav-btn btn-icon-only btn-settings"
                onClick={() => {
                  if (!isAdmin) {
                    setIsAdminModalOpen(true);
                  } else {
                    setIsSettingsOpen(true);
                  }
                }}
                title={isAdmin ? "System & Twitch Settings" : "Admin Passcode required to view Settings & Twitch Keys"}
              >
                <Settings size={15} color="#a855f7" />
              </button>

              {/* 6. Controls (Icon Only) */}
              <button
                className={`cyber-nav-btn btn-icon-only btn-view-controls-toggle ${isViewControlsOpen ? 'active' : ''}`}
                onClick={() => setIsViewControlsOpen(prev => !prev)}
                title="Toggle View, Physics & Camera Controls Menu"
              >
                <Sliders size={15} color={isViewControlsOpen ? '#d97706' : '#7D6B42'} />
              </button>

              {/* 7. Stream / OBS Logo Mode Toggle (Collapses controls to right for clean logo area) */}
              <button
                className={`cyber-nav-btn btn-topbar-stream-toggle ${isTopbarCompact ? 'is-compact active-amber' : ''}`}
                onClick={handleToggleTopbarCompact}
                title={isTopbarCompact ? "Expand Topbar (Show full branding and controls)" : "Stream Mode: Collapse controls to right (Clean logo area for OBS)"}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: isTopbarCompact ? '0.35rem 0.5rem' : '0.35rem 0.65rem',
                  borderColor: isTopbarCompact ? '#f59e0b' : undefined,
                }}
              >
                {isTopbarCompact ? <ChevronLeft size={15} color="#fbbf24" /> : <ChevronRight size={15} color="#94a3b8" />}
                <span className="btn-stream-toggle-text" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {isTopbarCompact ? 'Expand' : 'Stream Mode'}
                </span>
              </button>

              {/* 8. Presets Dropdown (Rightmost) */}
              <TopbarPresetsDropdown
                contest={contest}
                panelsConfig={panelsConfig}
                onApplyPreset={handleApplyPreset}
              />
            </div>
          </div>
        </header>
      )}

      {/* Top Collapsible View & Engine Controls Menu Tray */}
      {!isOBSMode && uiMode !== 'minimal' && uiMode !== 'viewer' && uiMode !== 'config' && isViewControlsOpen && (
        <div className="topbar-collapsible-tray-wrap">
          <ViewControlsBar
            renderEngine={renderEngine}
            onToggleRenderEngine={handleToggleRenderEngine}
            pileLayout={pileLayout}
            onChangePileLayout={setPileLayout}
            cameraAngle={cameraAngle}
            onChangeCameraAngle={setCameraAngle}
            uiMode={uiMode}
            onChangeUiMode={setUiMode}
            pileOffset={pileOffset}
            onChangePileOffset={setPileOffset}
            onClearArena={handleClearArena}
            onCondensePile={handleCondensePile}
            onJostleTokens={handleJostleTokens}
            onClose={() => setIsViewControlsOpen(false)}
            layoutConfig={screenLayout}
            onUpdateLayoutConfig={handleUpdateScreenLayout}
            bucketConfig={bucketConfig}
            onUpdateBucketConfig={handleUpdateBucketConfig}
            onActiveTabChange={setControlsTrayTab}
            onAdjustingBounds={setIsAdjustingHopperBounds}
            themeConfig={themeConfig}
            onUpdateThemeConfig={handleUpdateThemeConfig}
          />
        </div>
      )}

      {/* Main Grid: FULL MODE & OBS OVERLAY MODE (Modular Positionable Layout Engine) */}
      {(uiMode === 'full' || uiMode === 'obs') && (() => {
        const isLeftVisible = screenLayout.columnArrangement === 'default'
          ? screenLayout.showViewersPanel
          : screenLayout.showEntrantsSidebar;

        const isRightVisible = screenLayout.columnArrangement === 'default'
          ? screenLayout.showEntrantsSidebar
          : screenLayout.showViewersPanel;

        const gridModifierClass = !isLeftVisible && !isRightVisible
          ? 'grid-center-only'
          : !isLeftVisible
            ? 'grid-no-left'
            : !isRightVisible
              ? 'grid-no-right'
              : '';

        const viewersPanelNode = (
          <UserRosterPanel
            users={users}
            outcomes={contest.outcomes}
            onBet={handleBet}
            onOpenTokenMaker={(user) => setActiveTokenMakerUser(user)}
            onSimulateRandomBets={handleSimulateRandomBets}
            isSwarmActive={isSwarmActive}
            swarmCount={swarmCount}
            onToggleSwarm={handleToggleSwarm}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
            onUpdateUserPoints={handleUpdateUserPoints}
            onSetAllPoints={handleSetAllPoints}
            onAddPointsToAll={handleAddPointsToAll}
            onClearAllPoints={handleClearAllPoints}
            isDebugMode={isDebugMode}
            onToggleDebugMode={handleToggleDebugMode}
            title={panelsConfig.viewersTitle}
            emoji={panelsConfig.viewersEmoji}
            onUpdateTitle={handleUpdateViewersTitle}
            onOpenIconEditor={handleOpenViewersIconEditor}
            isAdmin={isAdmin}
            tokenTiers={tokenTiers}
          />
        );

        const entrantsSidebarNode = (
          <EntrantsSidebar
            contest={contest}
            onUpdateContest={setContest}
            onSelectWinner={handleSelectWinner}
            onQuickBetOnOutcome={handleQuickBetOnOutcome}
            onStatusChange={(status: ContestStatus) => setContest(prev => ({ ...prev, status }))}
            onResetContest={handleResetContest}
            filterText={filterText}
            cascadeKey={presetCascadeKey}
            onOpenAddHorse={() => setHorseEditorState({ isOpen: true, horse: null, mode: 'single' })}
            onEditHorse={(horse) => setHorseEditorState({ isOpen: true, horse, mode: 'single' })}
            title={panelsConfig.entrantsTitle}
            emoji={panelsConfig.entrantsEmoji}
            onUpdateTitle={handleUpdateEntrantsTitle}
            onOpenIconEditor={handleOpenEntrantsIconEditor}
            oddsMode={contest.oddsMode || 'auto'}
            onToggleOddsMode={handleToggleOddsMode}
            isAdmin={isAdmin}
          />
        );

        const oddsBarNode = (
          <ContestOddsBar
            contest={contest}
            filterText={filterText}
            onFilterTextChange={setFilterText}
            shineActive={isLockedShineActive}
            onSelectOutcome={(id) => handleHouseBetOnOutcome(id)}
            onUpdateTitle={(title) => setContest(prev => ({ ...prev, title }))}
            entrantsLabel={panelsConfig.entrantsTitle}
            icon={panelsConfig.raceEmoji}
            onOpenIconEditor={handleOpenRaceIconEditor}
            houseConfig={houseConfig}
            onAddDirectPot={handleAddDirectPot}
            onUpdateHouseConfig={handleUpdateHouseConfig}
          />
        );

        return (
          <main
            ref={mainGridRef}
            className={`app-main-grid ${gridModifierClass} ${isResizingSidebar ? 'is-resizing' : ''}`}
            style={{
              '--sidebar-left-width': `${leftSidebarWidth}px`,
              '--sidebar-right-width': `${rightSidebarWidth}px`,
            } as React.CSSProperties}
          >
            {/* Left Column (Viewers or Horses depending on arrangement) */}
            {isLeftVisible && (
              <aside className="app-sidebar-left">
                {screenLayout.columnArrangement === 'default' ? viewersPanelNode : entrantsSidebarNode}
                <div
                  className={`sidebar-resize-handle handle-right ${isResizingSidebar === 'left' ? 'is-dragging' : ''}`}
                  onMouseDown={handleStartResizeLeft}
                  onDoubleClick={() => handleResetSidebarWidth('left')}
                  title="Drag to resize window width (Double-click to reset to 320px)"
                >
                  <div className="sidebar-resize-grip" />
                  <span ref={leftTooltipRef} className="sidebar-resize-tooltip">{leftSidebarWidth}px</span>
                </div>
              </aside>
            )}

            {/* Center Column: Odds + Race Stage + Bucket */}
            <section className="app-center-content">
              {/* Odds Bar (Top Placement) */}
              {screenLayout.showOddsBar && screenLayout.oddsPlacement === 'top' && oddsBarNode}

              {/* Center Transparent Area: Reserved for OBS Race Video overlay */}
              <div className="race-visual-center-stage">
                {showTestRaceBg && !isOBSMode && (
                  <div className="simulated-race-backdrop">
                    <span className="sim-race-badge">
                      <Tv size={13} color="#b45309" />
                      <span>OBS Race Video Overlay Area</span>
                    </span>
                    <span className="sim-race-guide-hint">
                      📺 1080p Broadcast Window • Bucket Sits Directly Below
                    </span>
                  </div>
                )}
              </div>

              {/* Odds Bar (Bottom Placement) */}
              {screenLayout.showOddsBar && screenLayout.oddsPlacement === 'bottom' && oddsBarNode}
            </section>

            {/* Right Column (Horses or Viewers depending on arrangement) */}
            {isRightVisible && (
              <aside className="app-sidebar-right">
                <div
                  className={`sidebar-resize-handle handle-left ${isResizingSidebar === 'right' ? 'is-dragging' : ''}`}
                  onMouseDown={handleStartResizeRight}
                  onDoubleClick={() => handleResetSidebarWidth('right')}
                  title="Drag to resize window width (Double-click to reset to 320px)"
                >
                  <div className="sidebar-resize-grip" />
                  <span ref={rightTooltipRef} className="sidebar-resize-tooltip">{rightSidebarWidth}px</span>
                </div>
                {screenLayout.columnArrangement === 'default' ? entrantsSidebarNode : viewersPanelNode}
              </aside>
            )}
          </main>
        );
      })()}

      {/* COMPACT RACE MODE: Clear center area for video/broadcast, bottom race dock */}
      {uiMode === 'compact' && (
        <div className="compact-mode-container">
          {/* Top Smaller Odds Bar (when oddsPlacement === 'top') */}
          {screenLayout.showOddsBar && screenLayout.oddsPlacement === 'top' && (
            <CompactTopOddsBar
              contest={contest}
              onQuickBetOnOutcome={handleQuickBetOnOutcome}
            />
          )}

          <div className="compact-center-stage">
            {showTestRaceBg && (
              <div className="simulated-race-backdrop">
                <span className="sim-race-badge">
                  <Tv size={13} color="#b45309" />
                  <span>OBS Race Video Overlay Area</span>
                </span>
                <span className="sim-race-guide-hint">
                  📺 1080p Broadcast Window • Bucket Sits Directly Below
                </span>
              </div>
            )}
          </div>

          <CompactRaceDock
            contest={contest}
            onSelectWinner={handleSelectWinner}
            onQuickBetOnOutcome={handleQuickBetOnOutcome}
            onToggleStatus={handleToggleContestStatus}
            onExpandToFullUi={() => setUiMode('full')}
            onOpenViewerDrawer={() => setIsViewerDrawerOpen(true)}
            onSimulateBet={() => handleSimulateRandomBets(1)}
            houseConfig={houseConfig}
          />
        </div>
      )}

      {/* MINIMAL CORNER MODE: 95%+ screen clear */}
      {uiMode === 'minimal' && (
        <MinimalCornerHUD
          contest={contest}
          onExpandToFullUi={() => setUiMode('full')}
          onSimulateBet={() => handleSimulateRandomBets(1)}
          onToggleStatus={handleToggleContestStatus}
        />
      )}

      {/* DEDICATED VIEWER / MOBILE BET SLIP MODE */}
      {uiMode === 'viewer' && (
        <ViewerView
          contest={contest}
          onExitViewerMode={() => setUiMode('full')}
          isAdmin={isAdmin}
        />
      )}

      {/* TWITCH BROADCASTER EXTENSION CONFIGURATION MODE */}
      {uiMode === 'config' && (
        <ConfigView
          contest={contest}
          onExitConfig={() => setUiMode('full')}
        />
      )}

      {/* Slide-out Viewers Drawer (for compact/minimal modes) */}
      <ViewersDrawer
        isOpen={isViewerDrawerOpen}
        onClose={() => setIsViewerDrawerOpen(false)}
        users={users}
        outcomes={contest.outcomes}
        onBet={handleBet}
        onOpenTokenMaker={(user) => setActiveTokenMakerUser(user)}
        onSimulateRandomBets={handleSimulateRandomBets}
        isSwarmActive={isSwarmActive}
        swarmCount={swarmCount}
        onToggleSwarm={handleToggleSwarm}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onUpdateUserPoints={handleUpdateUserPoints}
        onSetAllPoints={handleSetAllPoints}
        onAddPointsToAll={handleAddPointsToAll}
        onClearAllPoints={handleClearAllPoints}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        title={panelsConfig.viewersTitle}
        emoji={panelsConfig.viewersEmoji}
        onUpdateTitle={handleUpdateViewersTitle}
        onOpenIconEditor={handleOpenViewersIconEditor}
        isAdmin={isAdmin}
      />

      {/* Live Token Hopper Bounds Calibration Preview Overlay */}
      <HopperBoundsPreviewOverlay
        isVisible={
          !isOBSMode &&
          uiMode !== 'viewer' && (
            bucketConfig.showCalibrationGuide ||
            isDebugGuidesActive ||
            (isViewControlsOpen && controlsTrayTab === 'bucket') ||
            isAdjustingHopperBounds
          )
        }
        bucketConfig={bucketConfig}
        pileLayout={pileLayout}
        renderEngine={renderEngine}
        isAdjusting={isAdjustingHopperBounds}
        onUpdateBucketConfig={handleUpdateBucketConfig}
        onAdjusting={setIsAdjustingHopperBounds}
      />

      {/* Hopper Custom-Positioned Themed Panel Backdrop */}
      <HopperBackdropPanel
        bucketConfig={bucketConfig}
        pileLayout={pileLayout}
        isVisible={uiMode !== 'viewer'}
      />

      {/* PERSISTENT PHYSICS ENGINES (Only active engine receives dropEvent and simulates physics; disabled in viewer mode or if tokens disabled) */}
      <PhysicsScene2D
        dropEvent={renderEngine === '2d' && bucketConfig.enableTokens !== false ? lastDrop : null}
        pileLayout={pileLayout}
        bucketConfig={bucketConfig}
        onResetTrigger={onResetTrigger}
        condenseTrigger={condenseTrigger}
        jostleTrigger={jostleTrigger}
        isWinnerBurst={isWinnerBurst}
        isVisible={uiMode !== 'viewer' && renderEngine === '2d' && bucketConfig.enableTokens !== false}
        isBucketTrapdoorOpen={isBucketTrapdoorOpen}
      />

      <PhysicsScene
        dropEvent={renderEngine === '3d' && bucketConfig.enableTokens !== false ? lastDrop : null}
        thickness={thickness}
        pileOffset={pileOffset}
        users={users}
        isWinnerBurst={isWinnerBurst}
        onResetTrigger={onResetTrigger}
        condenseTrigger={condenseTrigger}
        jostleTrigger={jostleTrigger}
        cameraAngle={cameraAngle}
        isVisible={uiMode !== 'viewer' && renderEngine === '3d' && bucketConfig.enableTokens !== false}
        bucketConfig={bucketConfig}
        pileLayout={pileLayout}
        isBucketTrapdoorOpen={isBucketTrapdoorOpen}
      />

      {/* Contest Betting History & Audit Log Modal */}
      <BetLogModal
        isOpen={isBetLogOpen}
        onClose={() => setIsBetLogOpen(false)}
        contest={contest}
        users={users}
        isDebugMode={isDebugMode}
      />

      {/* Floating Win / Lose / Bet Notification Cards */}
      <WinLoseNotificationOverlay
        notifications={floatingNotifications}
        onDismiss={(id) => setFloatingNotifications(prev => prev.filter(n => n.id !== id))}
        leftOffset={leftSidebarWidth}
        rightOffset={rightSidebarWidth}
        isViewersOnLeft={screenLayout.columnArrangement === 'default' && screenLayout.showViewersPanel}
        isViewersOnRight={screenLayout.columnArrangement === 'swapped' && screenLayout.showViewersPanel}
        oddsPlacement={screenLayout.oddsPlacement}
        showOddsBar={screenLayout.showOddsBar}
      />

      {/* 3D Token Maker / Workshop Modal */}
      {activeTokenMakerUser && (
        <TokenMakerModal
          user={activeTokenMakerUser}
          isOpen={true}
          onClose={() => setActiveTokenMakerUser(null)}
          onSave={handleSaveTokenConfig}
        />
      )}

      {/* Winner Celebration Modal */}
      <WinnerCelebrationModal
        data={celebrationData}
        isOpen={isCelebrationOpen}
        onClose={() => {
          setIsCelebrationOpen(false);
          broadcastStreamSync('CLOSE_CELEBRATION', {});
        }}
        onConfirmPayouts={handleConfirmPayouts}
        headerConfig={celebrationHeader}
        onUpdateHeaderConfig={handleUpdateCelebrationHeader}
      />

      {/* System & Twitch Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        silverThreshold={silverThreshold}
        goldThreshold={goldThreshold}
        onUpdateThresholds={(silver, gold) => {
          setSilverThreshold(silver);
          setGoldThreshold(gold);
        }}
        thickness={thickness}
        onUpdateThickness={setThickness}
        onClearArena={handleClearArena}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        onOpenDefaultTokenEditor={handleOpenDefaultTokenEditor}
        defaultTokenConfig={defaultTokenConfig}
        tokenTiers={tokenTiers}
        onUpdateTokenTiers={(tiers) => {
          setTokenTiers(tiers);
          reloadTierConfigs(tiers);
        }}
        layoutConfig={screenLayout}
        onUpdateLayoutConfig={handleUpdateScreenLayout}
        themeConfig={themeConfig}
        onUpdateThemeConfig={handleUpdateThemeConfig}
        bucketConfig={bucketConfig}
        onUpdateBucketConfig={handleUpdateBucketConfig}
        houseConfig={houseConfig}
        onUpdateHouseConfig={handleUpdateHouseConfig}
        onAddDirectPot={handleAddDirectPot}
        currentTotalPool={contest.totalPool}
        initialPrizePool={contest.initialPrizePool}
        celebrationHeaderConfig={celebrationHeader}
        onUpdateCelebrationHeaderConfig={handleUpdateCelebrationHeader}
        activeStyle={activeStyle}
        onUpdateActiveStyle={handleUpdateActiveStyle}
        oddsMode={contest.oddsMode || 'auto'}
        onToggleOddsMode={handleToggleOddsMode}
      />

      {/* Centralized Add Horse & Bulk Paste Window */}
      <HorseEditorModal
        isOpen={horseEditorState.isOpen}
        onClose={() => setHorseEditorState(prev => ({ ...prev, isOpen: false }))}
        horse={horseEditorState.horse}
        nextNumber={contest.outcomes.length + 1}
        currentHorseCount={contest.outcomes.length}
        initialMode={horseEditorState.mode}
        entrantLabel={panelsConfig.entrantsTitle || 'Entrant'}
        defaultIcon={panelsConfig.entrantsEmoji || '🏇'}
        oddsMode={contest.oddsMode || 'auto'}
        onToggleOddsMode={handleToggleOddsMode}
        onSave={handleSaveHorse}
        onDelete={handleRemoveEntrantById}
        onBulkImport={handleBulkImportHorses}
      />

      {/* Streamer GM Admin Passcode & Permission Unlock Modal */}
      <AdminUnlockModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isUnlocked={isAdmin}
        onUnlock={handleAdminUnlock}
        onLock={handleAdminLock}
        onUpdatePasscode={handleUpdateAdminPasscode}
      />
    </div>
  );
}

export default App;
