/**
 * Twitch Extension Service
 * 
 * Provides first-class integration with the official Twitch Extensions SDK (twitch-ext.min.js):
 * - Cryptographic identity verification via window.Twitch.ext.onAuthorized
 * - Role detection (broadcaster, moderator, viewer) from signed JWT
 * - Live theme synchronization with Twitch ('dark' | 'light') via window.Twitch.ext.onContext
 * - Real-time zero-cost sync across all viewer panels via Twitch Extension PubSub
 * - Identity share request helper (actions.requestIdShare)
 */

import type { Contest } from '../types/betting';

export interface TwitchExtAuth {
  channelId: string;
  clientId: string;
  token: string;
  userId: string;
  helixToken?: string;
}

export interface TwitchExtContext {
  theme?: 'light' | 'dark';
  mode?: 'viewer' | 'dashboard' | 'config';
  isFullScreen?: boolean;
  arePlayerControlsVisible?: boolean;
  game?: string;
  language?: string;
  bitrate?: number;
  hlsLatencyBroadcaster?: number;
}

export interface TwitchJWTPayload {
  exp?: number;
  opaque_user_id?: string;
  user_id?: string;
  channel_id?: string;
  role?: 'broadcaster' | 'moderator' | 'viewer' | 'external';
  pubsub_perms?: {
    listen?: string[];
    send?: string[];
  };
}

export interface TwitchPubSubMessage {
  type: string;
  payload: any;
  timestamp: number;
  senderId?: string;
  senderRole?: string;
}

declare global {
  interface Window {
    Twitch?: {
      ext?: {
        onAuthorized: (callback: (auth: TwitchExtAuth) => void) => void;
        onContext: (callback: (context: TwitchExtContext, delta: string[]) => void) => void;
        onError: (callback: (error: any) => void) => void;
        listen: (target: string, callback: (target: string, contentType: string, message: string) => void) => void;
        unlisten: (target: string, callback: (target: string, contentType: string, message: string) => void) => void;
        send: (target: string, contentType: string, message: object | string) => void;
        actions: {
          requestIdShare: () => void;
          followChannel: (channelName: string) => void;
          minimize: () => void;
        };
        viewer?: {
          isLinked?: boolean;
          id?: string;
          opaqueId?: string;
          role?: string;
          sessionToken?: string;
        };
        configuration?: {
          broadcaster?: { version: string; content: string };
          developer?: { version: string; content: string };
          global?: { version: string; content: string };
          onChanged: (callback: () => void) => void;
          set: (segment: 'broadcaster' | 'developer' | 'global', version: string, content: string) => void;
        };
        rig?: {
          log: (...args: any[]) => void;
        };
      };
    };
  }
}

class TwitchExtensionService {
  private auth: TwitchExtAuth | null = null;
  private jwtPayload: TwitchJWTPayload | null = null;
  private context: TwitchExtContext | null = null;
  private isInitialized = false;

  private authListeners: Array<(auth: TwitchExtAuth, isBroadcaster: boolean) => void> = [];
  private contextListeners: Array<(ctx: TwitchExtContext) => void> = [];
  private themeListeners: Array<(theme: 'light' | 'dark') => void> = [];
  private pubsubListeners: Array<(msg: TwitchPubSubMessage) => void> = [];

  constructor() {
    this.init();
  }

  /**
   * Initializes Twitch Extension SDK listeners if window.Twitch.ext is present
   */
  public init(): void {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    const ext = window.Twitch?.ext;
    if (!ext) {
      // If script is still loading or running outside Twitch, check periodically
      const checkTimer = setInterval(() => {
        if (window.Twitch?.ext) {
          clearInterval(checkTimer);
          this.init();
        }
      }, 300);

      // Stop polling after 5 seconds if outside Twitch iframe
      setTimeout(() => clearInterval(checkTimer), 5000);
      return;
    }

    this.isInitialized = true;

    try {
      // 1. Authorization Callback
      ext.onAuthorized((auth: TwitchExtAuth) => {
        this.auth = auth;
        this.jwtPayload = this.decodeJWT(auth.token);

        const isBroadcaster = this.getIsBroadcaster();

        // Notify auth listeners
        for (const listener of this.authListeners) {
          try {
            listener(auth, isBroadcaster);
          } catch (e) {
            console.error('[TwitchExt] Auth listener error:', e);
          }
        }

        // Setup PubSub listeners for this channel
        this.setupPubSubListeners();
      });

      // 2. Context Callback (theme, mode, layout)
      ext.onContext((ctx: TwitchExtContext, _delta: string[]) => {
        const prevTheme = this.context?.theme;
        this.context = { ...this.context, ...ctx };

        // Theme changed
        if (ctx.theme && ctx.theme !== prevTheme) {
          for (const listener of this.themeListeners) {
            try {
              listener(ctx.theme);
            } catch (e) {
              console.error('[TwitchExt] Theme listener error:', e);
            }
          }
        }

        for (const listener of this.contextListeners) {
          try {
            listener(this.context);
          } catch (e) {
            console.error('[TwitchExt] Context listener error:', e);
          }
        }
      });

      // 3. Error Callback
      if (ext.onError) {
        ext.onError((err: any) => {
          console.warn('[TwitchExt] Extension error:', err);
        });
      }
    } catch (e) {
      console.warn('[TwitchExt] SDK initialization error:', e);
    }
  }

  /**
   * Detects whether the app is currently running inside an official Twitch Extension iframe
   */
  public isExtensionEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    // 1. Explicit panel or viewer mode query parameter
    if (
      params.get('mode') === 'panel' ||
      params.get('mode') === 'viewer' ||
      params.get('anchor') === 'panel' ||
      params.get('panel') === '1' ||
      params.get('viewer') === '1'
    ) {
      return true;
    }
    // 2. Embedded inside an iframe on Twitch
    const isIframe = window.self !== window.top;
    if (isIframe && (params.get('platform') === 'web' || params.get('anchor') !== null || document.referrer.includes('twitch.tv'))) {
      return true;
    }
    return false;
  }

  /**
   * Returns current auth if available
   */
  public getAuth(): TwitchExtAuth | null {
    return this.auth;
  }

  /**
   * Returns decoded JWT payload
   */
  public getJWTPayload(): TwitchJWTPayload | null {
    return this.jwtPayload;
  }

  /**
   * Returns current context (theme, mode)
   */
  public getContext(): TwitchExtContext | null {
    return this.context;
  }

  /**
   * Returns the broadcaster channel ID
   */
  public getChannelId(): string | null {
    return this.auth?.channelId || this.jwtPayload?.channel_id || null;
  }

  /**
   * Returns the viewer's user ID (if shared) or opaque ID
   */
  public getUserId(): string | null {
    if (typeof window !== 'undefined' && window.Twitch?.ext?.viewer?.id) {
      return window.Twitch.ext.viewer.id;
    }
    return this.auth?.userId || this.jwtPayload?.user_id || this.jwtPayload?.opaque_user_id || null;
  }

  /**
   * Returns true if the user has shared their real Twitch identity (not opaque U...)
   * Also returns true if the user is the channel's Broadcaster (inherently authenticated).
   */
  public isIdentityShared(): boolean {
    if (typeof window !== 'undefined' && window.Twitch?.ext?.viewer?.isLinked) {
      return true;
    }
    if (this.getIsBroadcaster()) {
      return true;
    }
    const uid = this.getUserId();
    if (!uid) return false;
    // Opaque user IDs in Twitch start with 'U' (unlinked viewer) or 'A' (anonymous)
    return !uid.startsWith('U') && !uid.startsWith('A');
  }

  /**
   * Returns true if the user is the Broadcaster of the channel
   */
  public getIsBroadcaster(): boolean {
    if (this.jwtPayload?.role === 'broadcaster') return true;
    if (typeof window !== 'undefined' && window.Twitch?.ext?.viewer?.role === 'broadcaster') return true;
    return false;
  }

  /**
   * Prompt Twitch viewer to share their Twitch Identity
   */
  public requestIdentityShare(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isIdentityShared() || this.getIsBroadcaster()) {
      return true;
    }
    if (window.Twitch?.ext?.actions?.requestIdShare) {
      try {
        window.Twitch.ext.actions.requestIdShare();
        return true;
      } catch (e) {
        console.warn('[TwitchExt] requestIdShare error:', e);
        return false;
      }
    }
    console.warn('[TwitchExt] window.Twitch.ext.actions.requestIdShare is not available');
    return false;
  }

  /**
   * Subscribe to Auth updates
   */
  public onAuth(callback: (auth: TwitchExtAuth, isBroadcaster: boolean) => void): () => void {
    this.authListeners.push(callback);
    if (this.auth) {
      callback(this.auth, this.getIsBroadcaster());
    }
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== callback);
    };
  }

  /**
   * Subscribe to Theme updates ('light' | 'dark')
   */
  public onTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    this.themeListeners.push(callback);
    if (this.context?.theme) {
      callback(this.context.theme);
    }
    return () => {
      this.themeListeners = this.themeListeners.filter(l => l !== callback);
    };
  }

  /**
   * Subscribe to Twitch PubSub messages
   */
  public onPubSubMessage(callback: (msg: TwitchPubSubMessage) => void): () => void {
    this.pubsubListeners.push(callback);
    return () => {
      this.pubsubListeners = this.pubsubListeners.filter(l => l !== callback);
    };
  }

  /**
   * Broadcast contest or state update to all viewer panels via Twitch PubSub
   * Twitch limit is 5120 bytes per message.
   */
  public broadcast(type: string, payload: any): boolean {
    if (typeof window === 'undefined' || !window.Twitch?.ext?.send) {
      return false;
    }

    try {
      let finalPayload = payload;
      if (type === 'CONTEST_UPDATED' && payload?.outcomes) {
        finalPayload = this.minifyContestForPubSub(payload);
      }

      const msg: TwitchPubSubMessage = {
        type,
        payload: finalPayload,
        timestamp: Date.now(),
        senderRole: this.jwtPayload?.role || 'broadcaster'
      };

      const jsonStr = JSON.stringify(msg);

      // Twitch PubSub message length limit is 5120 bytes
      if (jsonStr.length > 5100) {
        console.warn(`[TwitchExt] PubSub message payload is too large (${jsonStr.length} bytes).`);
        return false;
      }

      window.Twitch.ext.send('broadcast', 'application/json', jsonStr);
      return true;
    } catch (e) {
      console.warn('[TwitchExt] Failed to send broadcast message:', e);
      return false;
    }
  }

  /**
   * Send a targeted whisper message (e.g. viewer bet request to broadcaster)
   */
  public sendWhisper(targetUserId: string, type: string, payload: any): boolean {
    if (typeof window === 'undefined' || !window.Twitch?.ext?.send) {
      return false;
    }

    try {
      const msg: TwitchPubSubMessage = {
        type,
        payload,
        timestamp: Date.now(),
        senderId: this.getUserId() || undefined,
        senderRole: this.jwtPayload?.role || 'viewer'
      };

      const jsonStr = JSON.stringify(msg);
      window.Twitch.ext.send(`whisper-${targetUserId}`, 'application/json', jsonStr);
      return true;
    } catch (e) {
      console.warn('[TwitchExt] Failed to send whisper message:', e);
      return false;
    }
  }

  /**
   * Helper to minify a Contest object for PubSub so it stays < 1KB
   */
  public minifyContestForPubSub(contest: Contest): Partial<Contest> {
    return {
      id: contest.id,
      title: contest.title,
      status: contest.status,
      totalPool: contest.totalPool,
      winningOutcomeId: contest.winningOutcomeId,
      podiumOutcomeIds: contest.podiumOutcomeIds,
      oddsMode: contest.oddsMode,
      outcomes: (contest.outcomes || []).map(o => ({
        id: o.id,
        name: o.name,
        number: o.number,
        color: o.color,
        icon: o.icon || '🐎',
        odds: Number(o.odds.toFixed(2)),
        totalBet: o.totalBet || 0,
        bettorCount: o.bettorCount || 0,
        percentage: Number((o.percentage || 0).toFixed(1)),
        isLocked: o.isLocked,
        manualOdds: o.manualOdds
      }))
    };
  }

  /**
   * Sets up PubSub listeners on the broadcast and whisper channels
   */
  private setupPubSubListeners(): void {
    const ext = window.Twitch?.ext;
    if (!ext || !ext.listen) return;

    const handleMessage = (_target: string, _contentType: string, rawMessage: string) => {
      try {
        const parsed: TwitchPubSubMessage = JSON.parse(rawMessage);
        if (parsed && parsed.type) {
          for (const listener of this.pubsubListeners) {
            try {
              listener(parsed);
            } catch (err) {
              console.error('[TwitchExt] Error in PubSub message listener:', err);
            }
          }
        }
      } catch (e) {
        console.warn('[TwitchExt] Failed to parse PubSub message:', e);
      }
    };

    try {
      // 1. Listen for global broadcasts to all viewers on this channel
      ext.listen('broadcast', handleMessage);

      // 2. If broadcaster or user has ID, listen for whispers targeted to them
      const myId = this.getUserId();
      if (myId) {
        ext.listen(`whisper-${myId}`, handleMessage);
      }
    } catch (e) {
      console.warn('[TwitchExt] Could not attach PubSub listeners:', e);
    }
  }

  /**
   * Sets Twitch Extension Configuration Segment (e.g. 'broadcaster', 'developer', or 'global')
   * This satisfies Twitch's requirement when 'Extension requires configuration' is enabled.
   */
  public setConfiguration(segment: 'broadcaster' | 'developer' | 'global', version: string, content: string | object): boolean {
    if (typeof window === 'undefined' || !window.Twitch?.ext?.configuration?.set) {
      console.warn('[TwitchExt] Twitch configuration SDK not available');
      return false;
    }

    try {
      const payloadStr = typeof content === 'string' ? content : JSON.stringify(content);
      window.Twitch.ext.configuration.set(segment, version, payloadStr);
      return true;
    } catch (e) {
      console.error('[TwitchExt] Failed to save configuration segment:', e);
      return false;
    }
  }

  /**
   * Reads Twitch Extension Configuration Segment
   */
  public getConfiguration(segment: 'broadcaster' | 'developer' | 'global' = 'broadcaster'): { version: string; content: string } | null {
    if (typeof window === 'undefined' || !window.Twitch?.ext?.configuration) {
      return null;
    }
    return window.Twitch.ext.configuration[segment] || null;
  }

  /**
   * Subscribes to configuration change events from Twitch
   */
  public onConfigurationChanged(callback: () => void): () => void {
    if (typeof window === 'undefined' || !window.Twitch?.ext?.configuration?.onChanged) {
      return () => {};
    }
    try {
      window.Twitch.ext.configuration.onChanged(callback);
    } catch (e) {
      console.warn('[TwitchExt] Error attaching configuration listener:', e);
    }
    return () => {};
  }

  /**
   * Decodes JWT payload safely without external dependencies
   */
  private decodeJWT(token: string): TwitchJWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}

export const twitchExtensionService = new TwitchExtensionService();
