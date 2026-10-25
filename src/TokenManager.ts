import type { TokenTier, UserTokenConfig, GeneratedTokenDef, DropEvent, TierConfig } from './types/betting';
import { storageService, DEFAULT_TIER_CONFIGS } from './services/storageService';

export type { TokenTier, UserTokenConfig, GeneratedTokenDef, DropEvent, TierConfig };

/**
 * Active in-memory cache of configured tiers, initialized from local storage.
 * Updated whenever tiers are customized or reset in settings.
 */
export let TIER_CONFIGS: TierConfig[] = typeof window !== 'undefined'
  ? storageService.getTokenTiers()
  : [...DEFAULT_TIER_CONFIGS];

export function getActiveTierConfigs(): TierConfig[] {
  if (typeof window !== 'undefined') {
    TIER_CONFIGS = storageService.getTokenTiers();
  }
  return TIER_CONFIGS;
}

export function reloadTierConfigs(newTiers?: TierConfig[]): TierConfig[] {
  const loaded = newTiers || (typeof window !== 'undefined' ? storageService.getTokenTiers() : [...DEFAULT_TIER_CONFIGS]);
  TIER_CONFIGS = [...loaded].sort((a, b) => b.value - a.value);
  return TIER_CONFIGS;
}

/**
 * Checks if adding `deltaAmount` to `prevAmount` crosses any higher-tier threshold
 */
export function checkTierConsolidation(prevAmount: number, nextAmount: number, customTiers?: TierConfig[]): boolean {
  if (prevAmount <= 0) return false;
  const tiers = customTiers || getActiveTierConfigs();
  for (const tierDef of tiers) {
    if (tierDef.value > 1) {
      const prevCount = Math.floor(prevAmount / tierDef.value);
      const nextCount = Math.floor(nextAmount / tierDef.value);
      if (nextCount > prevCount) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns the highest tier, styling, and radius matching a given point value
 */
export function getTierFromValue(val: number, customTiers?: TierConfig[]): { tier: TokenTier; tint: string; radius2D: number; scale3D: number } {
  const tiers = customTiers || getActiveTierConfigs();
  for (const t of tiers) {
    if (val >= t.value) {
      return { tier: t.tier, tint: t.tint, radius2D: t.radius2D, scale3D: t.scale3D };
    }
  }
  const base = tiers.find(t => t.value === 1) || tiers[tiers.length - 1];
  return {
    tier: base ? base.tier : 'base',
    tint: base ? base.tint : '#94a3b8',
    radius2D: base ? base.radius2D : 12,
    scale3D: base ? base.scale3D : 0.85
  };
}

/**
 * Breaks down any numeric amount into optimal token denominations,
 * accompanied by a generous, satisfying visual coin shower!
 */
export function breakdownAmountToTokenDefs(
  amount: number,
  userId: string,
  config: UserTokenConfig,
  outcomeColor: string = '#6366f1',
  customTiers?: TierConfig[]
): { def: GeneratedTokenDef; count: number }[] {
  let remaining = amount;
  const result: { def: GeneratedTokenDef; count: number }[] = [];
  const tiers = customTiers || getActiveTierConfigs();

  // 1. Primary Denomination breakdown (The "Boss" / High Value Prestige Coins)
  for (const tierDef of tiers) {
    if (tierDef.tier === 'base' || tierDef.value <= 1) continue; // Handled dynamically in companion shower below
    if (remaining >= tierDef.value) {
      const rawCount = Math.floor(remaining / tierDef.value);
      // Allow up to 8 of each primary tier coin per single bet
      const actualCount = Math.min(rawCount, 8);
      const perTokenVal = (rawCount * tierDef.value) / actualCount;

      const metalness = tierDef.metalBoost !== undefined && tierDef.metalBoost > 0 ? tierDef.metalBoost : (config.metalness ?? 0.8);
      const roughness = tierDef.roughOverride !== undefined && tierDef.roughOverride !== null ? tierDef.roughOverride : (config.roughness ?? 0.2);

      const def: GeneratedTokenDef = {
        id: `${userId}_${tierDef.tier}`,
        emoji: config.emoji,
        tier: tierDef.tier,
        metalness,
        roughness,
        colorTint: tierDef.tint,
        value: perTokenVal,
        entrantColor: outcomeColor,
        finish: config.finish || 'standard',
      };

      result.push({ def, count: actualCount });
      remaining -= rawCount * tierDef.value;
    }
  }

  // 2. Visual Companion Coin Shower:
  // Every bet drops a generous visual cascade of tokens (10–35 coins depending on bet size)
  // so the bucket always receives a rich, volumetric shower of coins that piles up high.
  let showerCount = 10;
  if (amount >= 1000000) {
    showerCount = 35;
  } else if (amount >= 100000) {
    showerCount = 30;
  } else if (amount >= 25000) {
    showerCount = 26;
  } else if (amount >= 5000) {
    showerCount = 22;
  } else if (amount >= 1000) {
    showerCount = 18;
  } else if (amount >= 500) {
    showerCount = 15;
  } else if (amount >= 100) {
    showerCount = 12;
  } else {
    showerCount = Math.max(6, Math.min(10, Math.floor(amount / 5)));
  }

  const baseVal = Math.max(1, remaining > 0 ? remaining / showerCount : 1);
  const baseDef: GeneratedTokenDef = {
    id: `${userId}_base`,
    emoji: config.emoji,
    tier: 'base',
    metalness: config.metalness || 0.65,
    roughness: config.roughness || 0.25,
    colorTint: config.colorTint || outcomeColor || '#fbbf24',
    value: baseVal,
    entrantColor: outcomeColor,
    finish: config.finish || 'standard',
  };

  result.push({ def: baseDef, count: showerCount });

  return result;
}

/**
 * Creates a DropEvent for single or consolidated bets
 */
export function breakdownBet(
  amount: number, 
  userId: string, 
  userName: string, 
  config: UserTokenConfig,
  _silverValue: number = 100,
  _goldValue: number = 500,
  outcomeId: string = '1',
  outcomeName: string = 'Pool',
  outcomeColor: string = '#6366f1',
  isTierMerge: boolean = false,
  customTiers?: TierConfig[]
): DropEvent {
  const tokens = breakdownAmountToTokenDefs(amount, userId, config, outcomeColor, customTiers);

  return {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    userName,
    outcomeId,
    outcomeName,
    outcomeColor,
    totalAmount: amount,
    tokens,
    timestamp: Date.now(),
    isTierMerge,
  };
}
