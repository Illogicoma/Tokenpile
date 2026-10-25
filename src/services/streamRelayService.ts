/**
 * Stream Relay Service
 * 
 * Bridges local multi-window OBS communication (BroadcastChannel) and Twitch-wide
 * live distribution (Twitch Extension PubSub) into a single, cohesive interface.
 */

import type { Contest, UserTokenConfig } from '../types/betting';
import { broadcastStreamSync, onStreamSync } from './storageService';
import { twitchExtensionService, type TwitchPubSubMessage } from './twitchExtensionService';

export interface ViewerBetPayload {
  userId: string;
  userName: string;
  amount: number;
  outcomeId: string;
  outcomeName?: string;
  tokenConfig?: UserTokenConfig;
  userConfig?: UserTokenConfig;
}

export interface ViewerTokenPayload {
  userId: string;
  userName: string;
  config: UserTokenConfig;
}

class StreamRelayService {
  private lastContestTimestamp = 0;
  private lastContestJson = '';

  /**
   * Broadcasts contest state (odds, entrants, pool, state) to both:
   * 1. Local OBS overlay & docks (via BroadcastChannel)
   * 2. Worldwide Twitch viewer panels (via Twitch Extension PubSub)
   */
  public broadcastContestUpdate(contest: Contest): void {
    // 1. Local BroadcastChannel
    broadcastStreamSync('CONTEST_UPDATED', contest);

    // 2. Twitch Extension PubSub (if running in Twitch Extension or connected)
    try {
      twitchExtensionService.broadcast('CONTEST_UPDATED', contest);
    } catch (e) {
      console.warn('[StreamRelay] Twitch PubSub broadcast warning:', e);
    }
  }

  /**
   * Broadcasts active theme or style change
   */
  public broadcastStyleUpdate(style: string): void {
    broadcastStreamSync('ACTIVE_STYLE_UPDATED', { style });
    twitchExtensionService.broadcast('ACTIVE_STYLE_UPDATED', { style });
  }

  /**
   * Viewers send their bet slip request into the Streamer's hopper
   */
  public sendViewerBet(payload: ViewerBetPayload): void {
    // Ensure both userConfig and tokenConfig are populated for backward compatibility
    const safePayload: ViewerBetPayload = {
      ...payload,
      tokenConfig: payload.tokenConfig || payload.userConfig,
      userConfig: payload.userConfig || payload.tokenConfig,
    };

    // 1. Local BroadcastChannel (works instantly in local dev and OBS browser docks)
    broadcastStreamSync('VIEWER_BET_REQUEST', safePayload);

    // 2. Twitch Extension PubSub whisper to Broadcaster
    const channelId = twitchExtensionService.getChannelId();
    if (channelId) {
      twitchExtensionService.sendWhisper(channelId, 'VIEWER_BET_REQUEST', safePayload);
    }
  }

  /**
   * Viewers send their customized 3D token styling to the Streamer's hopper
   */
  public sendViewerTokenUpdate(payload: ViewerTokenPayload): void {
    broadcastStreamSync('VIEWER_TOKEN_UPDATED', payload);

    const channelId = twitchExtensionService.getChannelId();
    if (channelId) {
      twitchExtensionService.sendWhisper(channelId, 'VIEWER_TOKEN_UPDATED', payload);
    }
  }

  /**
   * Listen for Contest updates from the Broadcaster (multiplexed from BroadcastChannel & Twitch PubSub)
   */
  public onContestUpdate(callback: (contest: Contest) => void): () => void {
    // Listener 1: Local BroadcastChannel
    const unsubBroadcast = onStreamSync((data) => {
      if (data.type === 'CONTEST_UPDATED' && data.payload) {
        this.dispatchContestIfNew(data.payload, callback);
      }
    });

    // Listener 2: Twitch Extension PubSub
    const unsubPubSub = twitchExtensionService.onPubSubMessage((msg: TwitchPubSubMessage) => {
      if (msg.type === 'CONTEST_UPDATED' && msg.payload) {
        this.dispatchContestIfNew(msg.payload, callback);
      }
    });

    return () => {
      unsubBroadcast();
      unsubPubSub();
    };
  }

  /**
   * Listen for incoming Viewer Bet Requests (Streamer/Broadcaster Hopper)
   */
  public onViewerBetRequest(callback: (payload: ViewerBetPayload) => void): () => void {
    const unsubBroadcast = onStreamSync((data) => {
      if (data.type === 'VIEWER_BET_REQUEST' && data.payload) {
        callback(data.payload);
      }
    });

    const unsubPubSub = twitchExtensionService.onPubSubMessage((msg: TwitchPubSubMessage) => {
      if (msg.type === 'VIEWER_BET_REQUEST' && msg.payload) {
        callback(msg.payload);
      }
    });

    return () => {
      unsubBroadcast();
      unsubPubSub();
    };
  }

  /**
   * Listen for incoming Viewer Token Customizations
   */
  public onViewerTokenUpdate(callback: (payload: ViewerTokenPayload) => void): () => void {
    const unsubBroadcast = onStreamSync((data) => {
      if (data.type === 'VIEWER_TOKEN_UPDATED' && data.payload) {
        callback(data.payload);
      }
    });

    const unsubPubSub = twitchExtensionService.onPubSubMessage((msg: TwitchPubSubMessage) => {
      if (msg.type === 'VIEWER_TOKEN_UPDATED' && msg.payload) {
        callback(msg.payload);
      }
    });

    return () => {
      unsubBroadcast();
      unsubPubSub();
    };
  }

  /**
   * Deduplicates contest updates to prevent duplicate re-renders
   */
  private dispatchContestIfNew(contest: Contest, callback: (c: Contest) => void): void {
    try {
      const serialized = JSON.stringify(contest);
      if (serialized === this.lastContestJson) {
        return;
      }
      this.lastContestJson = serialized;
      this.lastContestTimestamp = Date.now();
      callback(contest);
    } catch {
      callback(contest);
    }
  }

  public getLastContestTimestamp(): number {
    return this.lastContestTimestamp;
  }
}

export const streamRelayService = new StreamRelayService();
