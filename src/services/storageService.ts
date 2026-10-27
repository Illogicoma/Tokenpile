import type { SavedPreset, UserTokenConfig, BucketConfig, ScreenLayoutConfig, ThemeCustomizationConfig, ThemePreset, PanelsConfig, Contest, UserRosterItem, TwitchChatConfig, MaterialPreset, CelebrationHeaderConfig, TierConfig } from '../types/betting';
import { styleService } from './styleService';
import { twitchExtensionService } from './twitchExtensionService';

const PRESETS_KEY = 'TokenPile_custom_presets';
const MATERIAL_PRESETS_KEY = 'TokenPile_custom_material_presets';
const USER_TOKENS_KEY = 'TokenPile_user_tokens';
const DEFAULT_TOKEN_KEY = 'TokenPile_default_token';
const DEBUG_MODE_KEY = 'TokenPile_debug_mode';
const BUCKET_CONFIG_KEY = 'TokenPile_bucket_config';
const SCREEN_LAYOUT_KEY = 'TokenPile_screen_layout';
const THEME_CONFIG_KEY = 'TokenPile_theme_config';
const CUSTOM_THEME_PRESETS_KEY = 'TokenPile_custom_theme_presets';
const TOKEN_TIERS_KEY = 'TokenPile_token_tiers';
const PANELS_CONFIG_KEY = 'TokenPile_panels_config';
const CONTEST_STORAGE_KEY = 'TokenPile_active_contest';
const USERS_ROSTER_KEY = 'TokenPile_users_roster';
const TWITCH_CHAT_KEY = 'TokenPile_twitch_chat_config';
const CELEBRATION_HEADER_KEY = 'TokenPile_celebration_header_config';
const ACTIVE_STYLE_KEY = 'TokenPile_active_style';
const ADMIN_PASSCODE_KEY = 'TokenPile_admin_passcode';
const ADMIN_UNLOCKED_KEY = 'TokenPile_admin_unlocked';
const DEFAULT_ADMIN_PASSCODE = 'admin123';
const HAS_SEEN_ONBOARDING_KEY = 'TokenPile_has_seen_onboarding';

// BroadcastChannel for instant OBS Browser Source <-> Admin Control sync
// Generate unique client ID to prevent echo loops
const CLIENT_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('TokenPile_stream_sync')
  : null;

let lastSavedUsersJson = '';
let lastSavedContestJson = '';

// Cross-instance atomic bet lock & deduplication registry
const processedBetIds = new Set<string>();
const processedUpdateIds = new Set<string>();
let lastCleanLocksTime = 0;

function cleanOldLocks() {
  const now = Date.now();
  if (now - lastCleanLocksTime < 15000) return;
  lastCleanLocksTime = now;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('TokenPile_bet_lock_') || k.startsWith('TokenPile_tu_lock_'))) {
        const val = localStorage.getItem(k);
        if (val) {
          const parts = val.split('_');
          const ts = parseInt(parts[parts.length - 1], 10);
          if (isNaN(ts) || now - ts > 60000) {
            keysToRemove.push(k);
          }
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { }
}

export function claimBetProcessing(betId: string): boolean {
  if (!betId) return false;
  if (processedBetIds.has(betId)) return false;
  processedBetIds.add(betId);
  if (processedBetIds.size > 500) {
    const oldest = processedBetIds.values().next().value;
    if (oldest) processedBetIds.delete(oldest);
  }

  if (typeof window === 'undefined' || !window.localStorage) return true;

  const lockKey = `TokenPile_bet_lock_${betId}`;
  try {
    const existing = localStorage.getItem(lockKey);
    if (existing) {
      return false;
    }
    const val = `${CLIENT_ID}_${Date.now()}`;
    localStorage.setItem(lockKey, val);

    // Double-check race condition
    const check = localStorage.getItem(lockKey);
    if (check && !check.startsWith(CLIENT_ID)) {
      return false;
    }
    cleanOldLocks();
    return true;
  } catch {
    return true;
  }
}

export function claimTokenUpdateProcessing(updateId: string): boolean {
  if (!updateId) return false;
  if (processedUpdateIds.has(updateId)) return false;
  processedUpdateIds.add(updateId);
  if (processedUpdateIds.size > 500) {
    const oldest = processedUpdateIds.values().next().value;
    if (oldest) processedUpdateIds.delete(oldest);
  }

  if (typeof window === 'undefined' || !window.localStorage) return true;

  const lockKey = `TokenPile_tu_lock_${updateId}`;
  try {
    const existing = localStorage.getItem(lockKey);
    if (existing) return false;
    localStorage.setItem(lockKey, `${CLIENT_ID}_${Date.now()}`);
    const check = localStorage.getItem(lockKey);
    if (check && !check.startsWith(CLIENT_ID)) return false;
    cleanOldLocks();
    return true;
  } catch {
    return true;
  }
}

// Bounded deduplication registry to discard duplicate events delivered over both BroadcastChannel and SSE
const processedMsgIds = new Set<string>();
function isDuplicateMessage(msgId?: string): boolean {
  if (!msgId) return false;
  if (processedMsgIds.has(msgId)) return true;
  processedMsgIds.add(msgId);
  if (processedMsgIds.size > 300) {
    const oldest = processedMsgIds.values().next().value;
    if (oldest) processedMsgIds.delete(oldest);
  }
  return false;
}

export const broadcastStreamSync = (type: string, payload: any) => {
  const msgId = `${CLIENT_ID}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  processedMsgIds.add(msgId);

  const message = {
    type,
    payload,
    timestamp: Date.now(),
    senderId: CLIENT_ID,
    msgId
  };

  try {
    syncChannel?.postMessage(message);
  } catch { }

  // Forward to local server SSE relay (connects Chrome tab to OBS Studio CEF)
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/sync/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      }).catch(() => { });
    } catch { }
  }

  // Forward to Twitch Extension PubSub and Configuration Service
  try {
    if (type === 'CONTEST_UPDATED') {
      const minified = twitchExtensionService.minifyContestForPubSub(payload);
      twitchExtensionService.broadcast(type, minified);
      if (twitchExtensionService.getIsBroadcaster()) {
        twitchExtensionService.setConfiguration('broadcaster', '1.0', {
          contest: minified,
          updatedAt: Date.now()
        });
      }
    } else if (type === 'ACTIVE_STYLE_UPDATED') {
      twitchExtensionService.broadcast(type, payload);
    } else if (type === 'VIEWER_BET_REQUEST' || type === 'VIEWER_TOKEN_UPDATED') {
      const channelId = twitchExtensionService.getChannelId();
      if (channelId) {
        twitchExtensionService.sendWhisper(channelId, type, payload);
      }
    }
  } catch { }
};

type SyncCallback = (data: { type: string; payload: any; timestamp?: number; senderId?: string; msgId?: string }) => void;
const syncCallbacks = new Set<SyncCallback>();
let sharedSSE: EventSource | null = null;

function dispatchToCallbacks(data: any) {
  if (!data || !data.type) return;
  // Discard our own broadcasts to prevent self-echoes
  if (data.senderId === CLIENT_ID) return;
  // Discard duplicate messages arriving via both BroadcastChannel and SSE
  if (data.msgId && isDuplicateMessage(data.msgId)) return;

  for (const cb of syncCallbacks) {
    try {
      cb(data);
    } catch (e) {
      console.error('[StreamSync] Callback error:', e);
    }
  }
}

// Single module-level listener for BroadcastChannel
if (syncChannel) {
  syncChannel.addEventListener('message', (e: MessageEvent) => {
    if (e.data && e.data.type) {
      dispatchToCallbacks(e.data);
    }
  });
}

// Single module-level listener for Twitch PubSub
twitchExtensionService.onPubSubMessage((msg) => {
  dispatchToCallbacks({
    type: msg.type,
    payload: msg.payload,
    timestamp: msg.timestamp,
    senderId: msg.senderId
  });
});

function ensureSSEConnection() {
  if (typeof window === 'undefined' || !('EventSource' in window)) return;
  if (sharedSSE) return;

  try {
    sharedSSE = new EventSource('/api/sync/events');
    sharedSSE.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data) {
          dispatchToCallbacks(data);
        }
      } catch { }
    };
    sharedSSE.onerror = () => {
      if (sharedSSE && sharedSSE.readyState === EventSource.CLOSED) {
        sharedSSE.close();
        sharedSSE = null;
      }
    };
  } catch { }
}

function releaseSSEConnection() {
  if (syncCallbacks.size === 0 && sharedSSE) {
    try {
      sharedSSE.close();
    } catch { }
    sharedSSE = null;
  }
}

export const onStreamSync = (callback: SyncCallback) => {
  syncCallbacks.add(callback);
  ensureSSEConnection();

  return () => {
    syncCallbacks.delete(callback);
    releaseSSEConnection();
  };
};

const FALLBACK_DEFAULT_TOKEN: UserTokenConfig = {
  emoji: '🥕',
  metalness: 0.8,
  roughness: 0.2,
  colorTint: '#ffffffff',
  finish: 'standard',
};

export const DEFAULT_BUCKET_CONFIG: BucketConfig = {
  leftOffset: 290,
  rightOffset: 290,
  bottomMargin: 24,
  height: 240,
  hideWalls: true,
  backgroundVisible: false,
  enableTokens: true,
  showCalibrationGuide: false,
  combineThresholdPerUser: 40,
  maxArenaTokens: 800,
  enableAutoCombine: true,
};

export const DEFAULT_SCREEN_LAYOUT: ScreenLayoutConfig = {
  columnArrangement: 'default',
  showViewersPanel: true,
  showEntrantsSidebar: true,
  showOddsBar: true,
  showBucketFloor: true,
  oddsPlacement: 'top',
  sidebarLeftWidth: 320,
  sidebarRightWidth: 320,
};

export const DEFAULT_THEME_CONFIG: ThemeCustomizationConfig = {
  baseHue: 40,
  baseSaturation: 24,
  baseLightness: 91,
  greenAccent: '#3cae02',
  yellowAccent: '#d97706',
  textColor: '#5A4A28',
  surfaceOpacity: 1.0,
  borderRadius: 12,
  styleName: 'default',
};

export const DEFAULT_PANELS_CONFIG: PanelsConfig = {
  viewersTitle: 'Viewers',
  viewersEmoji: '👥',
  entrantsTitle: 'Entrants',
  entrantsEmoji: '🏇',
  raceEmoji: '🏆',
};

export const DEFAULT_CELEBRATION_HEADER_CONFIG: CelebrationHeaderConfig = {
  imageUrl: '',
  imageScale: 100,
  imagePosX: 50,
  imagePosY: 50,
  iconPosX: 49.5,
  iconPosY: 36.5,
  iconScale: 100,
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'pretty-horsey',
    name: 'Pretty Horsey',
    icon: '🏇',
    previewBg: '#F8FAFC',
    config: {
      baseHue: 210,
      baseSaturation: 8,
      baseLightness: 97,
      greenAccent: '#3cae02',
      yellowAccent: '#d97706',
      textColor: '#5A4A28',
      surfaceOpacity: 1.0,
      borderRadius: 10,
    }
  },
  {
    id: 'fine-motion',
    name: 'Fine Motion',
    icon: '🍀',
    previewBg: '#eeeae2',
    config: {
      baseHue: 40,
      baseSaturation: 24,
      baseLightness: 91,
      greenAccent: '#5dca6e',
      yellowAccent: '#e75142',
      textColor: '#0f172a',
      surfaceOpacity: 1.0,
      borderRadius: 12,
    }
  },
  {
    id: 'seiun-sky',
    name: 'Seiun Sky',
    icon: '🌻',
    previewBg: '#d1e3d3',
    config: {
      baseHue: 145,
      baseSaturation: 35,
      baseLightness: 92,
      greenAccent: '#adcd90',
      yellowAccent: '#f2ad21',
      textColor: '#14532d',
      surfaceOpacity: 1.0,
      borderRadius: 14,
    }
  },
  {
    id: 'special-week',
    name: 'Special Week',
    icon: '🌺',
    previewBg: '#f3ecee',
    config: {
      baseHue: 345,
      baseSaturation: 24,
      baseLightness: 94,
      greenAccent: '#e978d3',
      yellowAccent: '#f3bc52',
      textColor: '#ee6dcb',
      surfaceOpacity: 1.0,
      borderRadius: 16,
    }
  },
  {
    id: 'mejiro-mcqueen',
    name: 'Mejiro McQueen',
    icon: '🍵',
    previewBg: '#eef9fc',
    config: {
      baseHue: 190,
      baseSaturation: 66,
      baseLightness: 96,
      greenAccent: '#5dabb0',
      yellowAccent: '#ddc8ef',
      textColor: '#0c4a6e',
      surfaceOpacity: 1.0,
      borderRadius: 12,
    }
  },
  {
    id: 'narita-brian',
    name: 'Narita Brian',
    icon: '🌾',
    previewBg: '#e4dfec',
    config: {
      baseHue: 265,
      baseSaturation: 26,
      baseLightness: 90,
      greenAccent: '#a4608d',
      yellowAccent: '#f1bb98',
      textColor: '#4c1d95',
      surfaceOpacity: 1.0,
      borderRadius: 14,
    }
  },
  {
    id: 'oguri-cap',
    name: 'Oguri Cap',
    icon: '✨',
    previewBg: '#f1f1ee',
    config: {
      baseHue: 60,
      baseSaturation: 12,
      baseLightness: 94,
      greenAccent: '#ffd34a',
      yellowAccent: '#ca3e3c',
      textColor: '#bbbed6',
      surfaceOpacity: 1.0,
      borderRadius: 7,
    }
  },
  {
    id: 'el-condor-pasa',
    name: 'El Condor Pasa',
    icon: '🤼',
    previewBg: '#e25050',
    config: {
      baseHue: 0,
      baseSaturation: 72,
      baseLightness: 60,
      greenAccent: '#c62213',
      yellowAccent: '#c69e2f',
      textColor: '#f0f0f0',
      surfaceOpacity: 1.0,
      borderRadius: 12,
    }
  },
  {
    id: 'symboli-rudolf',
    name: 'Symboli Rudolf',
    icon: '♟️',
    previewBg: '#365e31',
    config: {
      baseHue: 114,
      baseSaturation: 26,
      baseLightness: 20,
      greenAccent: '#ab1c1c',
      yellowAccent: '#9e6c15',
      textColor: '#cd9e60',
      surfaceOpacity: 1.0,
      borderRadius: 12,
    }
  },
  {
    id: 'tamamo-cross',
    name: 'Tamamo Cross',
    icon: '💳',
    previewBg: '#6194fa',
    config: {
      baseHue: 220,
      baseSaturation: 94,
      baseLightness: 68,
      greenAccent: '#fe3434',
      yellowAccent: '#fef6f6',
      textColor: '#ffffff',
      surfaceOpacity: 1.0,
      borderRadius: 6,
    }
  },
  {
    id: 'copano-rickey',
    name: 'Copano Rickey',
    icon: '🌟',
    previewBg: '#f6db6f',
    config: {
      baseHue: 48,
      baseSaturation: 88,
      baseLightness: 70,
      greenAccent: '#ff4f60',
      yellowAccent: '#7c9aff',
      textColor: '#78350f',
      surfaceOpacity: 1.0,
      borderRadius: 12,
    }
  },
  {
    id: 'manhattan-cafe',
    name: 'Manhattan Cafe',
    icon: '☕',
    previewBg: '#222d41',
    config: {
      baseHue: 220,
      baseSaturation: 25,
      baseLightness: 12,
      greenAccent: '#41ae9c',
      yellowAccent: '#f7e48a',
      textColor: '#B0AC92',
      surfaceOpacity: 0.95,
      borderRadius: 12,
    }
  }
];

function adjustHexLightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  const delta = Math.round(255 * (percent / 100));
  const r = Math.min(255, Math.max(0, (num >> 16) + delta));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + delta));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + delta));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  { tier: 'colossal', name: 'Colossal', value: 1000000, tint: '#ef4444', metalBoost: 1.0, roughOverride: 0.02, radius2D: 34, scale3D: 2.20 },
  { tier: 'legendary', name: 'Legendary', value: 100000, tint: '#f59e0b', metalBoost: 1.0, roughOverride: 0.04, radius2D: 28, scale3D: 1.70 },
  { tier: 'mythic', name: 'Mythic', value: 25000, tint: '#a855f7', metalBoost: 1.0, roughOverride: 0.06, radius2D: 24, scale3D: 1.45 },
  { tier: 'platinum', name: 'Platinum', value: 5000, tint: '#06b6d4', metalBoost: 1.0, roughOverride: 0.08, radius2D: 20, scale3D: 1.25 },
  { tier: 'gold', name: 'Gold', value: 500, tint: '#fbbf24', metalBoost: 0.95, roughOverride: 0.12, radius2D: 17, scale3D: 1.10 },
  { tier: 'silver', name: 'Silver', value: 100, tint: '#cbd5e1', metalBoost: 0.85, roughOverride: 0.20, radius2D: 14, scale3D: 0.95 },
  { tier: 'base', name: 'Base', value: 1, tint: '#94a3b8', metalBoost: 0.00, roughOverride: null, radius2D: 12, scale3D: 0.85 },
];

export const storageService = {
  // --- Custom Presets ---
  getSavedPresets(): SavedPreset[] {
    try {
      const data = localStorage.getItem(PRESETS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePreset(preset: SavedPreset): SavedPreset[] {
    try {
      const current = this.getSavedPresets();
      const updated = [preset, ...current.filter(p => p.id !== preset.id)];
      localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  deletePreset(id: string): SavedPreset[] {
    try {
      const current = this.getSavedPresets();
      const updated = current.filter(p => p.id !== id);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  // --- Custom Material Presets ---
  getCustomMaterialPresets(): MaterialPreset[] {
    try {
      const data = localStorage.getItem(MATERIAL_PRESETS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomMaterialPreset(preset: Omit<MaterialPreset, 'id'> & { id?: string }): MaterialPreset[] {
    try {
      const current = this.getCustomMaterialPresets();
      const newPreset: MaterialPreset = {
        id: preset.id || `mat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: preset.name.trim() || 'My Material',
        metalness: Number(preset.metalness ?? 0.8),
        roughness: Number(preset.roughness ?? 0.2),
        colorTint: preset.colorTint || '#fbbf24',
        finish: preset.finish || 'standard',
        isCustom: true,
      };
      const updated = [newPreset, ...current.filter(p => p.id !== newPreset.id)];
      localStorage.setItem(MATERIAL_PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  deleteCustomMaterialPreset(id: string): MaterialPreset[] {
    try {
      const current = this.getCustomMaterialPresets();
      const updated = current.filter(p => p.id !== id);
      localStorage.setItem(MATERIAL_PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  // --- Viewer Token Preferences ---
  getUserTokens(): Record<string, UserTokenConfig> {
    try {
      const data = localStorage.getItem(USER_TOKENS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveUserToken(userNameOrId: string, config: UserTokenConfig) {
    try {
      const current = this.getUserTokens();
      current[userNameOrId.toLowerCase()] = config;
      localStorage.setItem(USER_TOKENS_KEY, JSON.stringify(current));
    } catch { }
  },

  getUserToken(userNameOrId: string): UserTokenConfig | null {
    try {
      const current = this.getUserTokens();
      return current[userNameOrId.toLowerCase()] || null;
    } catch {
      return null;
    }
  },

  // --- Default App Token for Joining Users ---
  getDefaultToken(): UserTokenConfig {
    try {
      const data = localStorage.getItem(DEFAULT_TOKEN_KEY);
      return data ? JSON.parse(data) : FALLBACK_DEFAULT_TOKEN;
    } catch {
      return FALLBACK_DEFAULT_TOKEN;
    }
  },

  saveDefaultToken(config: UserTokenConfig) {
    try {
      localStorage.setItem(DEFAULT_TOKEN_KEY, JSON.stringify(config));
    } catch { }
  },

  // --- Debug Mode Toggle ---
  getDebugMode(): boolean {
    try {
      const val = localStorage.getItem(DEBUG_MODE_KEY);
      return val !== null ? val === 'true' : false; // Default to false (clean live mode)
    } catch {
      return false;
    }
  },

  setDebugMode(enabled: boolean) {
    try {
      localStorage.setItem(DEBUG_MODE_KEY, String(enabled));
    } catch { }
  },

  // --- Token Tiers Configuration ---
  getTokenTiers(): TierConfig[] {
    try {
      const data = localStorage.getItem(TOKEN_TIERS_KEY);
      if (data) {
        const parsed: TierConfig[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => b.value - a.value);
        }
      }
      return [...DEFAULT_TIER_CONFIGS];
    } catch {
      return [...DEFAULT_TIER_CONFIGS];
    }
  },

  saveTokenTiers(tiers: TierConfig[]): TierConfig[] {
    try {
      const sorted = [...tiers].sort((a, b) => b.value - a.value);
      localStorage.setItem(TOKEN_TIERS_KEY, JSON.stringify(sorted));
      broadcastStreamSync('TOKEN_TIERS_UPDATED', sorted);
      return sorted;
    } catch {
      return tiers;
    }
  },

  resetTokenTiers(): TierConfig[] {
    try {
      localStorage.removeItem(TOKEN_TIERS_KEY);
      broadcastStreamSync('TOKEN_TIERS_UPDATED', DEFAULT_TIER_CONFIGS);
      return [...DEFAULT_TIER_CONFIGS];
    } catch {
      return [...DEFAULT_TIER_CONFIGS];
    }
  },

  // --- Bucket Boundary Settings ---
  getBucketConfig(): BucketConfig {
    try {
      const data = localStorage.getItem(BUCKET_CONFIG_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_BUCKET_CONFIG,
          ...parsed,
          backgroundVisible: parsed.backgroundVisible !== undefined
            ? parsed.backgroundVisible
            : (parsed.hideWalls !== undefined ? !parsed.hideWalls : false),
          enableTokens: parsed.enableTokens !== undefined ? parsed.enableTokens : true,
        };
      }
      return DEFAULT_BUCKET_CONFIG;
    } catch {
      return DEFAULT_BUCKET_CONFIG;
    }
  },

  saveBucketConfig(config: BucketConfig): void {
    try {
      localStorage.setItem(BUCKET_CONFIG_KEY, JSON.stringify(config));
    } catch { }
  },

  // --- Screen Layout & Panel Visibility Settings ---
  getScreenLayout(): ScreenLayoutConfig {
    try {
      const data = localStorage.getItem(SCREEN_LAYOUT_KEY);
      if (data) {
        return { ...DEFAULT_SCREEN_LAYOUT, ...JSON.parse(data) };
      }
      return DEFAULT_SCREEN_LAYOUT;
    } catch {
      return DEFAULT_SCREEN_LAYOUT;
    }
  },

  saveScreenLayout(layout: ScreenLayoutConfig): void {
    try {
      localStorage.setItem(SCREEN_LAYOUT_KEY, JSON.stringify(layout));
    } catch { }
  },

  // --- Theme & Color Customization Settings ---
  getThemeConfig(): ThemeCustomizationConfig {
    try {
      const data = localStorage.getItem(THEME_CONFIG_KEY);
      if (data) {
        return { ...DEFAULT_THEME_CONFIG, ...JSON.parse(data) };
      }
      return DEFAULT_THEME_CONFIG;
    } catch {
      return DEFAULT_THEME_CONFIG;
    }
  },

  saveThemeConfig(config: ThemeCustomizationConfig): void {
    try {
      localStorage.setItem(THEME_CONFIG_KEY, JSON.stringify(config));
    } catch { }
  },

  // --- Custom Theme Presets ---
  getCustomThemePresets(): ThemePreset[] {
    try {
      const data = localStorage.getItem(CUSTOM_THEME_PRESETS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getAllThemePresets(): ThemePreset[] {
    const custom = this.getCustomThemePresets();
    return [...THEME_PRESETS, ...custom];
  },

  saveCustomThemePreset(preset: ThemePreset): ThemePreset[] {
    try {
      const current = this.getCustomThemePresets();
      const updated = [
        { ...preset, isCustom: true },
        ...current.filter(p => p.id !== preset.id)
      ];
      localStorage.setItem(CUSTOM_THEME_PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  deleteCustomThemePreset(id: string): ThemePreset[] {
    try {
      const current = this.getCustomThemePresets();
      const updated = current.filter(p => p.id !== id);
      localStorage.setItem(CUSTOM_THEME_PRESETS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  applyThemeToDocument(config: ThemeCustomizationConfig): void {
    if (typeof document === 'undefined') return;
    styleService.setActiveStyle(config.styleName || 'default');
    const root = document.documentElement;
    const { baseHue, baseSaturation, baseLightness, greenAccent, yellowAccent, textColor, surfaceOpacity, borderRadius } = config;

    const isDark = baseLightness < 45;
    const bgL = isDark ? Math.max(4, baseLightness - 4) : Math.max(5, baseLightness - 4);
    const bgSecondaryL = isDark ? Math.max(7, baseLightness - 6) : Math.max(8, baseLightness - 8);

    root.style.setProperty('--bg-color', `hsl(${baseHue}, ${baseSaturation}%, ${bgL}%)`);
    root.style.setProperty('--bg-secondary', `hsl(${baseHue}, ${baseSaturation}%, ${bgSecondaryL}%)`);

    root.style.setProperty('--card-bg', `hsla(${baseHue}, ${baseSaturation}%, ${baseLightness}%, ${surfaceOpacity})`);

    const elevatedL = isDark ? Math.min(100, baseLightness + 8) : Math.min(100, baseLightness + 4);
    root.style.setProperty('--card-bg-elevated', `hsla(${baseHue}, ${Math.min(100, baseSaturation + 5)}%, ${elevatedL}%, ${surfaceOpacity})`);

    const borderL = isDark ? Math.min(100, baseLightness + 18) : Math.max(0, baseLightness - 40);
    const borderA = isDark ? 0.28 : 0.28;
    root.style.setProperty('--card-border', `hsla(${baseHue}, ${baseSaturation}%, ${borderL}%, ${borderA})`);
    root.style.setProperty('--card-border-hover', `hsla(${baseHue}, ${baseSaturation}%, ${borderL}%, ${borderA + 0.15})`);

    const wellL = isDark ? Math.max(0, baseLightness - 6) : Math.max(0, baseLightness - 12);
    root.style.setProperty('--well-bg', `hsla(${baseHue}, ${Math.max(0, baseSaturation - 8)}%, ${wellL}%, ${Math.max(0.35, surfaceOpacity * 0.7)})`);
    root.style.setProperty('--well-border', `hsla(${baseHue}, ${baseSaturation}%, ${borderL}%, ${borderA * 0.85})`);

    // Text Colors
    root.style.setProperty('--text-primary', textColor);
    root.style.setProperty('--text-title', textColor);
    root.style.setProperty('--text-secondary', textColor);
    root.style.setProperty('--text-muted', isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(90, 74, 40, 0.72)');

    // Green Accent & Gradients
    root.style.setProperty('--accent-green', greenAccent);
    root.style.setProperty('--accent-green-grad', `linear-gradient(180deg, ${adjustHexLightness(greenAccent, 24)} 0%, ${greenAccent} 100%)`);
    root.style.setProperty('--accent-green-dark', adjustHexLightness(greenAccent, -20));

    // Yellow / Amber Accent & Gradients
    root.style.setProperty('--accent-gold', yellowAccent);
    root.style.setProperty('--accent-gold-grad', `linear-gradient(180deg, ${adjustHexLightness(yellowAccent, 35)} 0%, ${yellowAccent} 100%)`);
    root.style.setProperty('--accent-gold-dark', adjustHexLightness(yellowAccent, -18));

    // Corner radius
    root.style.setProperty('--app-radius', `${borderRadius}px`);
    root.style.setProperty('--app-radius-sm', `${borderRadius === 0 ? 0 : Math.max(2, Math.round(borderRadius * 0.55))}px`);
    root.style.setProperty('--app-radius-lg', `${Math.round(borderRadius * 1.35)}px`);

    // Modal Backdrop: Dim less as requested!
    root.style.setProperty('--modal-backdrop-bg', isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.32)');
    root.style.setProperty('--modal-backdrop-blur', '3px');

    // Themed Scrollbars hooked into active theme palette
    const scrollThumbL = isDark ? Math.min(100, baseLightness + 26) : Math.max(0, baseLightness - 32);
    root.style.setProperty('--scrollbar-thumb', `hsla(${baseHue}, ${baseSaturation}%, ${scrollThumbL}%, 0.45)`);
    root.style.setProperty('--scrollbar-thumb-hover', yellowAccent);
    root.style.setProperty('--scrollbar-track', `hsla(${baseHue}, ${Math.max(0, baseSaturation - 10)}%, ${wellL}%, 0.25)`);
  },

  // --- Panels Customization (Viewers & Entrants Title & Icon) ---
  getPanelsConfig(): PanelsConfig {
    try {
      const data = localStorage.getItem(PANELS_CONFIG_KEY);
      if (data) {
        return { ...DEFAULT_PANELS_CONFIG, ...JSON.parse(data) };
      }
      return DEFAULT_PANELS_CONFIG;
    } catch {
      return DEFAULT_PANELS_CONFIG;
    }
  },

  savePanelsConfig(config: PanelsConfig): void {
    try {
      localStorage.setItem(PANELS_CONFIG_KEY, JSON.stringify(config));
    } catch { }
  },

  // --- Celebration Header Customization (Twitter-style banner positioning) ---
  getCelebrationHeaderConfig(): CelebrationHeaderConfig {
    try {
      const data = localStorage.getItem(CELEBRATION_HEADER_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.iconPosX === 49.0 && parsed.iconPosY === 37.4) {
          parsed.iconPosX = 49.5;
          parsed.iconPosY = 36.5;
        }
        return { ...DEFAULT_CELEBRATION_HEADER_CONFIG, ...parsed };
      }
      return DEFAULT_CELEBRATION_HEADER_CONFIG;
    } catch {
      return DEFAULT_CELEBRATION_HEADER_CONFIG;
    }
  },

  saveCelebrationHeaderConfig(config: CelebrationHeaderConfig): void {
    try {
      localStorage.setItem(CELEBRATION_HEADER_KEY, JSON.stringify(config));
      broadcastStreamSync('celebration_header_update', config);
    } catch { }
  },

  // --- Custom Icons & Web Links Library ---
  getCustomIcons(): CustomIconItem[] {
    try {
      const data = localStorage.getItem('TokenPile_custom_icons');
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  },

  saveCustomIcon(icon: CustomIconItem): void {
    this.saveCustomIcons([icon]);
  },

  saveCustomIcons(icons: CustomIconItem[]): void {
    try {
      if (!icons || icons.length === 0) return;
      const current = this.getCustomIcons();
      const newIds = new Set(icons.map(i => i.id));
      const newSrcs = new Set(icons.map(i => i.src));
      const filtered = current.filter(i => !newIds.has(i.id) && !newSrcs.has(i.src));
      // Store up to 1000 icons so multi-folder collections are completely preserved
      const updated = [...icons, ...filtered].slice(0, 1000);
      localStorage.setItem('TokenPile_custom_icons', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom icons to localStorage:', e);
    }
  },

  deleteCustomIcon(id: string): void {
    try {
      const current = this.getCustomIcons();
      const updated = current.filter(i => i.id !== id);
      localStorage.setItem('TokenPile_custom_icons', JSON.stringify(updated));
    } catch { }
  },

  deleteFolder(folderName: string): void {
    try {
      const current = this.getCustomIcons();
      const updated = current.filter(i => (i.folder || 'Default Folder') !== folderName);
      localStorage.setItem('TokenPile_custom_icons', JSON.stringify(updated));
    } catch { }
  },

  clearAllCustomIcons(): void {
    try {
      localStorage.removeItem('TokenPile_custom_icons');
    } catch { }
  },

  getSavedWebLinks(): string[] {
    try {
      const data = localStorage.getItem('TokenPile_saved_web_links');
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  },

  saveWebLink(url: string): void {
    try {
      if (!url.trim()) return;
      const current = this.getSavedWebLinks();
      const filtered = current.filter(u => u !== url.trim());
      const updated = [url.trim(), ...filtered].slice(0, 50);
      localStorage.setItem('TokenPile_saved_web_links', JSON.stringify(updated));
    } catch { }
  },

  deleteWebLink(url: string): void {
    try {
      const current = this.getSavedWebLinks();
      const updated = current.filter(u => u !== url);
      localStorage.setItem('TokenPile_saved_web_links', JSON.stringify(updated));
    } catch { }
  },

  // --- Contest & Roster Local Persistence ---
  getContest(): Contest | null {
    try {
      const data = localStorage.getItem(CONTEST_STORAGE_KEY);
      if (data) return JSON.parse(data);
      return null;
    } catch {
      return null;
    }
  },

  getLastSavedContestJson(): string {
    return lastSavedContestJson;
  },

  recordContestJson(json: string): void {
    lastSavedContestJson = json;
  },

  markRemoteContestSaved(contest: Contest): void {
    try {
      const json = JSON.stringify(contest);
      lastSavedContestJson = json;
      localStorage.setItem(CONTEST_STORAGE_KEY, json);
    } catch { }
  },

  saveContest(contest: Contest): void {
    try {
      const json = JSON.stringify(contest);
      if (json === lastSavedContestJson) return; // Skip redundant writes/broadcasts
      lastSavedContestJson = json;
      localStorage.setItem(CONTEST_STORAGE_KEY, json);
      broadcastStreamSync('CONTEST_UPDATED', contest);
    } catch (e) {
      console.warn('Failed to save contest to localStorage:', e);
    }
  },

  getUsers(): UserRosterItem[] | null {
    try {
      const data = localStorage.getItem(USERS_ROSTER_KEY);
      if (data) return JSON.parse(data);
      return null;
    } catch {
      return null;
    }
  },

  getLastSavedUsersJson(): string {
    return lastSavedUsersJson;
  },

  recordUsersJson(json: string): void {
    lastSavedUsersJson = json;
  },

  markRemoteUsersSaved(users: UserRosterItem[]): void {
    try {
      const json = JSON.stringify(users);
      lastSavedUsersJson = json;
      localStorage.setItem(USERS_ROSTER_KEY, json);
    } catch { }
  },

  saveUsers(users: UserRosterItem[]): void {
    try {
      const json = JSON.stringify(users);
      if (json === lastSavedUsersJson) return; // Skip redundant writes/broadcasts
      lastSavedUsersJson = json;
      localStorage.setItem(USERS_ROSTER_KEY, json);
      broadcastStreamSync('USERS_UPDATED', users);
    } catch (e) {
      console.warn('Failed to save users to localStorage:', e);
    }
  },

  getTwitchChatConfig(): TwitchChatConfig {
    let base: TwitchChatConfig = {
      channel: '',
      botPrefix: '!bet',
      joinCommand: '!join',
      leaveCommand: '!leave',
      lockCommand: '!lock',
      openCommand: '!open',
      resetCommand: '!reset',
      giveCommand: '!give',
      oddsCommand: '!odds',
      startingTokens: 50000,
      autoConnect: true,
    };
    try {
      const data = localStorage.getItem(TWITCH_CHAT_KEY);
      if (data) {
        base = { ...base, ...JSON.parse(data) };
      }
    } catch { }

    // If channel is provided in URL query parameters, auto-bind and auto-connect
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlChannel = params.get('channel') || params.get('ch') || params.get('room');
        if (urlChannel) {
          base.channel = urlChannel.trim().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/^[#@]/, '').toLowerCase();
          base.autoConnect = true;
        }
      } catch { }
    }

    return base;
  },

  saveTwitchChatConfig(config: Partial<TwitchChatConfig>): TwitchChatConfig {
    try {
      const current = this.getTwitchChatConfig();
      const updated = { ...current, ...config };
      localStorage.setItem(TWITCH_CHAT_KEY, JSON.stringify(updated));
      broadcastStreamSync('TWITCH_CONFIG_UPDATED', updated);
      return updated;
    } catch {
      return this.getTwitchChatConfig();
    }
  },

  getActiveStyle(): string {
    try {
      const data = localStorage.getItem(ACTIVE_STYLE_KEY);
      if (data && data.trim()) {
        return data.trim().toLowerCase();
      }
    } catch { }
    return 'default';
  },

  saveActiveStyle(style: string): void {
    try {
      const clean = (style || 'default').trim().toLowerCase();
      localStorage.setItem(ACTIVE_STYLE_KEY, clean);
      broadcastStreamSync('ACTIVE_STYLE_UPDATED', { style: clean });
    } catch { }
  },

  getAdminPasscode(): string {
    try {
      const saved = localStorage.getItem(ADMIN_PASSCODE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch { }
    return DEFAULT_ADMIN_PASSCODE;
  },

  saveAdminPasscode(passcode: string): void {
    try {
      localStorage.setItem(ADMIN_PASSCODE_KEY, passcode.trim());
    } catch { }
  },

  isAdminUnlocked(): boolean {
    try {
      // 1. URL Parameter override (e.g. ?admin=admin123 or ?key=admin123)
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const adminParam = params.get('admin') || params.get('key');
        if (adminParam) {
          if (adminParam === 'viewer' || adminParam === '0') return false;
          if (adminParam === this.getAdminPasscode() || adminParam === '1') return true;
        }
      }
      // 2. Local storage session
      const saved = localStorage.getItem(ADMIN_UNLOCKED_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
      // 3. Defaults to unlocked in localhost / OBS Studio environment
      return this.isLocalOrObsEnvironment();
    } catch {
      return true;
    }
  },

  setAdminUnlocked(unlocked: boolean): void {
    try {
      localStorage.setItem(ADMIN_UNLOCKED_KEY, unlocked ? 'true' : 'false');
    } catch { }
  },

  isLocalOrObsEnvironment(): boolean {
    if (typeof window === 'undefined') return true;
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || window.location.protocol === 'file:';
    const isObs = Boolean((window as any).obsstudio) || (typeof navigator !== 'undefined' && navigator.userAgent.includes('OBS'));
    return isLocal || isObs;
  },

  hasSeenOnboarding(): boolean {
    try {
      return localStorage.getItem(HAS_SEEN_ONBOARDING_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setSeenOnboarding(seen: boolean = true): void {
    try {
      localStorage.setItem(HAS_SEEN_ONBOARDING_KEY, seen ? 'true' : 'false');
    } catch { }
  }
};


export interface CustomIconItem {
  id: string;
  name: string;
  src: string;
  type: 'local' | 'url';
  dateAdded: number;
  folder?: string;
}

