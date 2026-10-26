export type TokenTier = 'base' | 'silver' | 'gold' | 'platinum' | 'mythic' | 'legendary' | 'colossal' | (string & {});

export interface TierConfig {
  tier: string;
  name: string;
  value: number;
  tint: string;
  metalBoost?: number;
  roughOverride?: number | null;
  radius2D: number;
  scale3D: number;
  isCustom?: boolean;
}

export interface UserTokenConfig {
  emoji: string;
  metalness: number;
  roughness: number;
  colorTint?: string;
  finish?: 'standard' | 'chrome' | 'matte' | 'neon' | 'gem';
  customLabel?: string;
}

export interface MaterialPreset {
  id: string;
  name: string;
  metalness: number;
  roughness: number;
  colorTint: string;
  finish?: string;
  isCustom?: boolean;
}

export interface GeneratedTokenDef {
  id: string; // e.g. "u1_gold"
  emoji: string;
  tier: TokenTier;
  metalness: number;
  roughness: number;
  colorTint: string;
  value: number;
  entrantColor?: string;
  finish?: string;
}

export interface DropEvent {
  id: string;
  userId: string;
  userName: string;
  outcomeId: string;
  outcomeName: string;
  outcomeColor: string;
  totalAmount: number;
  tokens: { def: GeneratedTokenDef; count: number }[];
  timestamp: number;
  userAccumulatedAmount?: number;
  isTierMerge?: boolean;
}

export interface BetOutcome {
  id: string;
  number: number;
  name: string;
  color: string;
  icon: string;
  totalBet: number;
  bettorCount: number;
  odds: number; // Multiplier, e.g. 3.25
  percentage: number; // 0 to 100
  isLocked?: boolean; // When true, horse is locked/disabled from the current race
  manualOdds?: number; // Starting morning-line or fixed odds multiplier (e.g. 2.0 = 2x / 2:1)
}

export interface BetRecord {
  id: string;
  userId: string;
  userName: string;
  outcomeId: string;
  outcomeName: string;
  amount: number;
  timestamp: number;
  payout?: number;
  isWin?: boolean;
}

export type ContestStatus = 'open' | 'locked' | 'resolved' | 'refunded';
export type OddsMode = 'auto' | 'manual';

export interface Contest {
  id: string;
  title: string;
  description?: string;
  status: ContestStatus;
  oddsMode?: OddsMode; // 'auto' (pari-mutuel pool) or 'manual' (fixed odds)
  outcomes: BetOutcome[];
  totalPool: number;
  winningOutcomeId?: string;
  podiumOutcomeIds?: string[];
  expectedWinnersCount?: number;
  createdAt: number;
  minBet: number;
  maxBet: number;
  bets: BetRecord[];
  initialPrizePool?: number;
  resolvedAt?: number;
}

export interface HouseConfig {
  name: string;
  betAmount: number;
  emoji: string;
  defaultPrizePool?: number;
}

export interface UserRosterItem {
  id: string;
  name: string;
  tokens: number;
  config: UserTokenConfig;
  currentBetInput: string;
  lastOutcomeId?: string;
  lastResult?: {
    type: 'win' | 'lose';
    amount: number;
    outcomeName: string;
    timestamp: number;
    place?: number;
  };
  isMockUser?: boolean;
}

export interface TwitchChatConfig {
  channel: string;
  botPrefix: string; // default "!bet"
  joinCommand?: string; // default "!join"
  leaveCommand?: string; // default "!leave"
  startingTokens: number; // default 50000
  autoConnect: boolean;
}

export interface ParsedBetCommand {
  username: string;
  displayName: string;
  color?: string;
  targetOutcome: string; // e.g. "14" or "Thunderbolt"
  amount: number;
  isAllIn?: boolean;
  isBroadcaster?: boolean;
  isMod?: boolean;
  rawMessage: string;
}

export interface ParsedJoinCommand {
  username: string;
  displayName: string;
  color?: string;
  isBroadcaster?: boolean;
  isMod?: boolean;
  rawMessage: string;
}

export interface ParsedLeaveCommand {
  username: string;
  displayName: string;
  isBroadcaster?: boolean;
  isMod?: boolean;
  rawMessage: string;
}

export interface ParsedAdminCommand {
  command: 'lock' | 'open' | 'reset' | 'give' | 'odds';
  targetUser?: string;
  amount?: number;
  targetOutcome?: string;
  oddsValue?: number;
  username: string;
  displayName: string;
  isBroadcaster: boolean;
  isMod: boolean;
  rawMessage: string;
}

export interface WinCelebrationData {
  winningOutcome: BetOutcome;
  podiumOutcomes?: {
    outcome: BetOutcome;
    place: number;
    poolShare: number;
    sharePct: number;
    bettorCount: number;
    oddsMultiplier: number;
  }[];
  totalPool: number;
  winningPool: number;
  oddsMultiplier: number;
  winners: {
    userId: string;
    userName: string;
    betAmount: number;
    payout: number;
    place?: number;
    outcomeName?: string;
    config: UserTokenConfig;
  }[];
  losers: {
    userId: string;
    userName: string;
    betAmount: number;
  }[];
}

export interface SavedPreset {
  id: string;
  name: string;
  title: string;
  outcomes: BetOutcome[];
  createdAt: number;
  panelsConfig?: PanelsConfig;
}

export type RenderEngine = '3d' | '2d';
export type PileLayout = 'corner-br' | 'corner-bl' | 'bottom-center' | 'side-right' | 'center';
export type CameraAngle3D = 'perspective' | 'side-profile' | 'top-down' | 'corner-isometric';
export type UiDisplayMode = 'full' | 'compact' | 'minimal' | 'obs' | 'viewer' | 'config';

export interface BucketConfig {
  leftOffset: number;   // px offset from left edge of screen
  rightOffset: number;  // px offset from right edge of screen
  bottomMargin: number; // px offset from bottom of screen
  height: number;       // height of bucket in px
  hideWalls?: boolean;  // legacy alias for !backgroundVisible
  backgroundVisible?: boolean; // if true, themed panel background is visible behind tokens
  enableTokens?: boolean;      // toggle physical tokens on/off (if false, tokens are disabled entirely)
  showCalibrationGuide?: boolean; // if true, shows dashed boundary guides for alignment
  combineThresholdPerUser?: number; // min tokens per viewer before fusion triggers (default: 40)
  maxArenaTokens?: number;          // global max active tokens allowed in hopper (default: 800)
  enableAutoCombine?: boolean;      // toggle automatic collision fusion on/off (default: true)
}

export type ColumnArrangement = 'default' | 'swapped';
export type OddsBarPlacement = 'top' | 'bottom';

export interface ScreenLayoutConfig {
  columnArrangement: ColumnArrangement; // 'default': Viewers Left, Horses Right | 'swapped': Horses Left, Viewers Right
  showViewersPanel: boolean;            // Show/hide viewers & chat simulation panel
  showEntrantsSidebar: boolean;         // Show/hide entrants / horse cards sidebar
  showOddsBar: boolean;                 // Show/hide center live odds readout bar
  showBucketFloor: boolean;             // Show/hide bucket status & condense floor controls
  oddsPlacement: OddsBarPlacement;      // 'top': above race footage | 'bottom': below race footage
  sidebarLeftWidth?: number;            // Width in px of left sidebar (default: 320)
  sidebarRightWidth?: number;           // Width in px of right sidebar (default: 320)
}

export interface ThemeCustomizationConfig {
  baseHue: number;          // 0 to 360 (degrees) for background/surfaces tint
  baseSaturation: number;   // 0 to 100 (%)
  baseLightness: number;    // 10 to 98 (%)
  greenAccent: string;      // hex (e.g. #3cae02)
  yellowAccent: string;     // hex (e.g. #d97706)
  textColor: string;        // hex (e.g. #5A4A28)
  surfaceOpacity: number;   // 0.2 to 1.0 (20% to 100%)
  borderRadius: number;     // 0 to 24 (px)
  styleName?: string;       // Style directory theme name (e.g. 'default', 'scifi')
}

export interface ThemePreset {
  id: string;
  name: string;
  icon: string;
  previewBg: string;
  config: ThemeCustomizationConfig;
  isCustom?: boolean;
}

export interface PanelsConfig {
  viewersTitle: string;
  viewersEmoji: string;
  viewersTokenConfig?: UserTokenConfig;
  entrantsTitle: string;
  entrantsEmoji: string;
  entrantsTokenConfig?: UserTokenConfig;
  raceEmoji?: string;
  raceTokenConfig?: UserTokenConfig;
}

export interface CelebrationHeaderConfig {
  imageUrl?: string;        // Custom image URL or data URL; if empty, uses styleService.getImage('tp_victory.png')
  imageScale: number;       // % zoom (default: 100)
  imagePosX: number;        // % horizontal position (default: 50)
  imagePosY: number;        // % vertical position (default: 50)
  iconPosX: number;         // % icon horizontal position (default: 49.5)
  iconPosY: number;         // % icon vertical position (default: 36.5)
  iconScale: number;        // % icon scale (default: 100)
}

