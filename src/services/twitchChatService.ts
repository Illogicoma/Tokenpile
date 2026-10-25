import type { TwitchChatConfig, ParsedBetCommand, ParsedJoinCommand, ParsedLeaveCommand, ParsedAdminCommand } from '../types/betting';
import { storageService } from './storageService';

export type TwitchConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class TwitchChatService {
  private ws: WebSocket | null = null;
  private config: TwitchChatConfig;
  private status: TwitchConnectionStatus = 'disconnected';
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private pingInterval: any = null;

  // Event Listeners
  private betListeners: Array<(cmd: ParsedBetCommand) => void> = [];
  private joinListeners: Array<(cmd: ParsedJoinCommand) => void> = [];
  private leaveListeners: Array<(cmd: ParsedLeaveCommand) => void> = [];
  private adminListeners: Array<(cmd: ParsedAdminCommand) => void> = [];
  private statusListeners: Array<(status: TwitchConnectionStatus, channel: string) => void> = [];
  private messageListeners: Array<(msg: { username: string; displayName: string; color?: string; text: string }) => void> = [];

  constructor() {
    this.config = storageService.getTwitchChatConfig();
  }

  public getConfig(): TwitchChatConfig {
    return { ...this.config };
  }

  public saveConfig(partial: Partial<TwitchChatConfig>): void {
    const updated = storageService.saveTwitchChatConfig(partial);
    const channelChanged = partial.channel !== undefined && this.cleanChannelName(partial.channel) !== this.cleanChannelName(this.config.channel);
    this.config = updated;

    if (channelChanged && this.status === 'connected') {
      this.disconnect();
      if (this.config.channel) {
        this.connect();
      }
    }
  }

  public getStatus(): TwitchConnectionStatus {
    return this.status;
  }

  public cleanChannelName(channel: string): string {
    if (!channel) return '';
    return channel
      .trim()
      .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
      .replace(/^[#@]/, '')
      .toLowerCase();
  }

  public onBetCommand(listener: (cmd: ParsedBetCommand) => void): () => void {
    this.betListeners.push(listener);
    return () => {
      this.betListeners = this.betListeners.filter(l => l !== listener);
    };
  }

  public onJoinCommand(listener: (cmd: ParsedJoinCommand) => void): () => void {
    this.joinListeners.push(listener);
    return () => {
      this.joinListeners = this.joinListeners.filter(l => l !== listener);
    };
  }

  public onLeaveCommand(listener: (cmd: ParsedLeaveCommand) => void): () => void {
    this.leaveListeners.push(listener);
    return () => {
      this.leaveListeners = this.leaveListeners.filter(l => l !== listener);
    };
  }

  public onAdminCommand(listener: (cmd: ParsedAdminCommand) => void): () => void {
    this.adminListeners.push(listener);
    return () => {
      this.adminListeners = this.adminListeners.filter(l => l !== listener);
    };
  }

  public onStatusChange(listener: (status: TwitchConnectionStatus, channel: string) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status, this.cleanChannelName(this.config.channel));
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public onChatMessage(listener: (msg: { username: string; displayName: string; color?: string; text: string }) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  private setStatus(status: TwitchConnectionStatus) {
    this.status = status;
    const channel = this.cleanChannelName(this.config.channel);
    for (const listener of this.statusListeners) {
      try {
        listener(status, channel);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    }
  }

  public connect(): void {
    const channel = this.cleanChannelName(this.config.channel);
    if (!channel) {
      console.warn('[TwitchChat] No channel name configured.');
      this.setStatus('disconnected');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        console.log(`[TwitchChat] Connected to Twitch IRC gateway for #${channel}`);
        this.reconnectAttempts = 0;
        
        // Request extended tags (display-name, user color, badges)
        this.ws?.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        
        // Anonymous read-only credentials
        const anonymousNick = `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
        this.ws?.send('PASS SCHMOOPIE');
        this.ws?.send(`NICK ${anonymousNick}`);
        this.ws?.send(`JOIN #${channel}`);

        this.setStatus('connected');

        // Setup ping interval every 4 minutes to keep socket active
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('PING :tmi.twitch.tv');
          }
        }, 240000);
      };

      this.ws.onmessage = (event) => {
        const raw = event.data as string;
        this.handleRawMessage(raw);
      };

      this.ws.onerror = (err) => {
        console.warn('[TwitchChat] WebSocket error:', err);
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        console.log('[TwitchChat] Connection closed');
        this.setStatus('disconnected');
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        // Automatic exponential reconnect if autoConnect is enabled
        if (this.config.autoConnect && this.cleanChannelName(this.config.channel)) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      console.error('[TwitchChat] Failed to open WebSocket:', e);
      this.setStatus('error');
      if (this.config.autoConnect) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[TwitchChat] Max reconnect attempts reached.');
      return;
    }
    const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;
    console.log(`[TwitchChat] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleRawMessage(raw: string): void {
    const lines = raw.split('\r\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      // Handle Twitch PING keepalive
      if (line.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv\r\n');
        continue;
      }

      // Parse PRIVMSG
      if (line.includes('PRIVMSG')) {
        this.parsePrivMsg(line);
      }
    }
  }

  private parsePrivMsg(line: string): void {
    let tags: Record<string, string> = {};
    let rest = line;

    if (rest.startsWith('@')) {
      const spaceIdx = rest.indexOf(' ');
      const rawTags = rest.substring(1, spaceIdx);
      rest = rest.substring(spaceIdx + 1);

      for (const pair of rawTags.split(';')) {
        const [k, v] = pair.split('=');
        if (k) tags[k] = v || '';
      }
    }

    // Example rest: ":username!username@username.tmi.twitch.tv PRIVMSG #channel :!bet 14 500"
    const prefixMatch = rest.match(/^:([^!]+)!/);
    const fallbackUsername = prefixMatch ? prefixMatch[1] : 'viewer';
    const displayName = tags['display-name'] || fallbackUsername;
    const username = (tags['username'] || fallbackUsername).toLowerCase();
    const color = tags['color'] || undefined;

    const privMsgIdx = rest.indexOf('PRIVMSG');
    if (privMsgIdx === -1) return;

    const colonIdx = rest.indexOf(' :', privMsgIdx);
    if (colonIdx === -1) return;

    const chatText = rest.substring(colonIdx + 2).trim();

    // Verify Twitch Broadcaster and Moderator roles from IRC tags
    const badges = tags['badges'] || '';
    const channel = this.cleanChannelName(this.config.channel);
    const isBroadcaster = badges.includes('broadcaster') || (Boolean(channel) && username === channel);
    const isMod = isBroadcaster || tags['mod'] === '1' || badges.includes('moderator');

    // Broadcast chat message to any general listeners
    for (const l of this.messageListeners) {
      try {
        l({ username, displayName, color, text: chatText });
      } catch (e) {
        console.error('Error in chat message listener:', e);
      }
    }

    // 1. Broadcaster & Moderator Administrative Commands (!lock, !open, !reset, !give, !odds)
    const lowerChat = chatText.toLowerCase();
    if (lowerChat === '!lock' || lowerChat === '!closelock' || lowerChat === '!closebets') {
      if (isMod) {
        this.emitAdminCommand({ command: 'lock', username, displayName, isBroadcaster, isMod, rawMessage: chatText });
      }
      return;
    }
    if (lowerChat === '!open' || lowerChat === '!unlock' || lowerChat === '!reopen') {
      if (isMod) {
        this.emitAdminCommand({ command: 'open', username, displayName, isBroadcaster, isMod, rawMessage: chatText });
      }
      return;
    }
    if (lowerChat === '!reset' || lowerChat === '!newrace') {
      if (isMod) {
        this.emitAdminCommand({ command: 'reset', username, displayName, isBroadcaster, isMod, rawMessage: chatText });
      }
      return;
    }
    if (lowerChat.startsWith('!give ') || lowerChat.startsWith('!addpoints ')) {
      // Security: Viewers cannot run !give or !addpoints
      if (isMod) {
        const parts = chatText.split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const targetUser = parts[1].replace(/^@/, '').toLowerCase();
          const amount = parseInt(parts[2].replace(/,/g, ''), 10);
          if (targetUser && !isNaN(amount) && amount > 0) {
            this.emitAdminCommand({ command: 'give', targetUser, amount, username, displayName, isBroadcaster, isMod, rawMessage: chatText });
          }
        }
      }
      return;
    }
    if (lowerChat.startsWith('!odds ')) {
      if (isMod) {
        const parts = chatText.split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const targetOutcome = parts[1].replace(/^#/, '');
          const oddsValue = parseFloat(parts[2]);
          if (targetOutcome && !isNaN(oddsValue) && oddsValue > 1) {
            this.emitAdminCommand({ command: 'odds', targetOutcome, oddsValue, username, displayName, isBroadcaster, isMod, rawMessage: chatText });
          }
        }
      }
      return;
    }

    // 2. Check if message is a join command (default: !join)
    const joinCmd = this.config.joinCommand || '!join';
    if (this.isCommandMatch(chatText, joinCmd, '!join')) {
      const parsedJoin: ParsedJoinCommand = {
        username,
        displayName,
        color,
        isBroadcaster,
        isMod,
        rawMessage: chatText,
      };
      for (const l of this.joinListeners) {
        try {
          l(parsedJoin);
        } catch (e) {
          console.error('Error in join listener:', e);
        }
      }
      return;
    }

    // 3. Check if message is a leave command (default: !leave)
    const leaveCmd = this.config.leaveCommand || '!leave';
    if (this.isCommandMatch(chatText, leaveCmd, '!leave')) {
      const parsedLeave: ParsedLeaveCommand = {
        username,
        displayName,
        isBroadcaster,
        isMod,
        rawMessage: chatText,
      };
      for (const l of this.leaveListeners) {
        try {
          l(parsedLeave);
        } catch (e) {
          console.error('Error in leave listener:', e);
        }
      }
      return;
    }

    // 4. Check if message is a betting command (default: !bet)
    const parsedBet = this.parseBetString(chatText, username, displayName, color);
    if (parsedBet) {
      parsedBet.isBroadcaster = isBroadcaster;
      parsedBet.isMod = isMod;
      for (const l of this.betListeners) {
        try {
          l(parsedBet);
        } catch (e) {
          console.error('Error in bet listener:', e);
        }
      }
    }
  }

  private emitAdminCommand(cmd: ParsedAdminCommand): void {
    for (const l of this.adminListeners) {
      try {
        l(cmd);
      } catch (e) {
        console.error('Error in admin command listener:', e);
      }
    }
  }

  /**
   * Helper to determine if a chat message matches a configured command keyword
   * Allows:
   *  - Case-insensitivity (e.g. !JOIN, !join)
   *  - Matching with or without exclamation mark prefix (e.g. '!join' or 'join')
   *  - Optional trailing whitespace or words (e.g. '!join', '!join me')
   */
  public isCommandMatch(message: string, commandConfig?: string, defaultCmd: string = ''): boolean {
    const rawCmd = (commandConfig || defaultCmd).trim().toLowerCase();
    if (!rawCmd) return false;

    const trimmedMsg = message.trim().toLowerCase();
    if (!trimmedMsg) return false;

    const prefixes = [rawCmd];
    if (rawCmd.startsWith('!')) {
      prefixes.push(rawCmd.substring(1));
    } else {
      prefixes.push('!' + rawCmd);
    }

    const firstWord = trimmedMsg.split(/\s+/)[0];
    return prefixes.some(p => firstWord === p || trimmedMsg === p || trimmedMsg.startsWith(p + ' '));
  }

  /**
   * Parses flexible bet commands:
   * Examples:
   * "!bet 14 500"
   * "!bet #14 500"
   * "!bet 14 5k"
   * "!bet 14 all" or "!bet 14 max"
   * "!bet all 14"
   * "!bet thunderbolt 1000"
   * "!bet 1000 on 14"
   */
  public parseBetString(
    message: string, 
    username: string = 'test_user', 
    displayName: string = 'Test Viewer', 
    color?: string
  ): ParsedBetCommand | null {
    const trimmed = message.trim();
    if (!trimmed) return null;

    const rawPrefix = (this.config.botPrefix || '!bet').trim().toLowerCase();
    const prefixes = [rawPrefix];
    if (rawPrefix.startsWith('!')) {
      prefixes.push(rawPrefix.substring(1));
    } else {
      prefixes.push('!' + rawPrefix);
    }

    const lower = trimmed.toLowerCase();
    const matchedPrefix = prefixes.find(p => lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + '#'));
    if (!matchedPrefix) return null;

    const afterPrefix = trimmed.substring(matchedPrefix.length).trim();
    if (!afterPrefix) return null;

    const tokens = afterPrefix.split(/\s+/).filter(Boolean);
    if (tokens.length < 1) return null;

    let targetOutcome = '';
    let amount = 0;
    let isAllIn = false;

    // Check for "all" or "max" keyword
    const hasAll = tokens.some(t => t.toLowerCase() === 'all' || t.toLowerCase() === 'max');
    if (hasAll) {
      isAllIn = true;
      // All remaining tokens (excluding 'all', 'max', and standalone 'on') form the outcome name
      const remainingTokens = tokens.filter(t => {
        const tl = t.toLowerCase();
        return tl !== 'all' && tl !== 'max' && tl !== 'on';
      });
      if (remainingTokens.length > 0) {
        targetOutcome = remainingTokens.join(' ').replace(/^#/, '').trim();
      }
    } else if (tokens.length >= 2) {
      // Possible patterns:
      // Pattern 1: Amount is first -> "!bet 500 on Special Week" or "!bet 500 Special Week"
      // Pattern 2: Amount is last  -> "!bet Special Week 500" or "!bet #3 500" or "!bet on Special Week 500"
      const amountAtStart = this.parseTokenAmount(tokens[0]);
      const amountAtEnd = this.parseTokenAmount(tokens[tokens.length - 1]);

      if (amountAtStart !== null && amountAtEnd === null) {
        // First token is amount
        amount = amountAtStart;
        const targetTokens = tokens.slice(1);
        if (targetTokens.length > 0 && targetTokens[0].toLowerCase() === 'on') {
          targetTokens.shift();
        }
        targetOutcome = targetTokens.join(' ').replace(/^#/, '').trim();
      } else if (amountAtEnd !== null && amountAtStart === null) {
        // Last token is amount
        amount = amountAtEnd;
        const targetTokens = tokens.slice(0, tokens.length - 1);
        if (targetTokens.length > 0 && targetTokens[0].toLowerCase() === 'on') {
          targetTokens.shift();
        }
        targetOutcome = targetTokens.join(' ').replace(/^#/, '').trim();
      } else if (amountAtStart !== null && amountAtEnd !== null) {
        // Both tokens parse as numbers (e.g. "!bet 3 500" or "!bet 500 on 3")
        if (tokens.length >= 3 && tokens[1].toLowerCase() === 'on') {
          // "!bet 500 on 3"
          amount = amountAtStart;
          targetOutcome = tokens.slice(2).join(' ').replace(/^#/, '').trim();
        } else if (amountAtStart <= 30 && amountAtEnd > 30) {
          // Likely "!bet <horse_num> <amount>" e.g. "!bet 3 500"
          targetOutcome = tokens[0].replace(/^#/, '').trim();
          amount = amountAtEnd;
        } else if (amountAtStart > 30 && amountAtEnd <= 30) {
          // Likely "!bet <amount> <horse_num>" e.g. "!bet 500 3"
          amount = amountAtStart;
          targetOutcome = tokens[tokens.length - 1].replace(/^#/, '').trim();
        } else {
          // Default: first is outcome number, last is amount
          targetOutcome = tokens[0].replace(/^#/, '').trim();
          amount = amountAtEnd;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (!targetOutcome) return null;
    if (!isAllIn && amount <= 0) return null;

    return {
      username,
      displayName,
      color,
      targetOutcome,
      amount,
      isAllIn,
      rawMessage: message,
    };
  }

  /**
   * Parses token amounts with support for 'k' and 'm' multipliers
   * e.g. "500" -> 500, "5k" -> 5000, "1.5k" -> 1500, "1m" -> 1000000
   */
  private parseTokenAmount(val: string): number | null {
    if (!val) return null;
    const clean = val.trim().toLowerCase();

    // Check if it's purely a number
    if (/^\d+$/.test(clean)) {
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? null : parsed;
    }

    // Check for 'k' or 'm' multiplier
    const match = clean.match(/^(\d+(?:\.\d+)?)\s*([km])$/);
    if (match) {
      const num = parseFloat(match[1]);
      if (isNaN(num)) return null;
      const unit = match[2];
      if (unit === 'k') return Math.round(num * 1000);
      if (unit === 'm') return Math.round(num * 1000000);
    }

    return null;
  }

  /**
   * Helper to simulate a bet directly for testing from settings or debug tools
   */
  public simulateIncomingBet(
    targetOutcome: string, 
    amount: number, 
    username: string = 'TwitchViewer', 
    displayName: string = 'TwitchViewer'
  ): void {
    const cmd: ParsedBetCommand = {
      username: username.toLowerCase(),
      displayName,
      targetOutcome: targetOutcome.replace(/^#/, ''),
      amount,
      isAllIn: false,
      rawMessage: `${this.config.botPrefix || '!bet'} ${targetOutcome} ${amount}`,
    };

    for (const l of this.betListeners) {
      try {
        l(cmd);
      } catch (e) {
        console.error('Error in simulated bet listener:', e);
      }
    }
  }

  /**
   * Helper to simulate a join directly for testing from settings or debug tools
   */
  public simulateIncomingJoin(
    username: string = 'TwitchViewer',
    displayName: string = 'TwitchViewer',
    color?: string
  ): void {
    const cmd: ParsedJoinCommand = {
      username: username.toLowerCase(),
      displayName,
      color,
      rawMessage: `${this.config.joinCommand || '!join'}`,
    };

    for (const l of this.joinListeners) {
      try {
        l(cmd);
      } catch (e) {
        console.error('Error in simulated join listener:', e);
      }
    }
  }

  /**
   * Helper to simulate a leave directly for testing from settings or debug tools
   */
  public simulateIncomingLeave(
    username: string = 'TwitchViewer',
    displayName: string = 'TwitchViewer'
  ): void {
    const cmd: ParsedLeaveCommand = {
      username: username.toLowerCase(),
      displayName,
      rawMessage: `${this.config.leaveCommand || '!leave'}`,
    };

    for (const l of this.leaveListeners) {
      try {
        l(cmd);
      } catch (e) {
        console.error('Error in simulated leave listener:', e);
      }
    }
  }
}

export const twitchChatService = new TwitchChatService();
