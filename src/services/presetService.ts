import type { BetOutcome, SavedPreset, PanelsConfig } from '../types/betting';

export interface BuiltinPresetDef {
  id: string;
  name: string;
  title: string;
  items: { name: string; icon: string; color: string }[];
  panelsConfig?: Partial<PanelsConfig>;
}

export const BUILTIN_PRESETS: BuiltinPresetDef[] = [
  {
    id: 'derby_20',
    name: '🐎 20-Horse Derby Race',
    title: '🏇 Royal Grand Derby (20-Horse Race)',
    panelsConfig: {
      raceEmoji: '🏇',
      entrantsEmoji: '🐎',
      entrantsTitle: 'Horses',
      viewersEmoji: '👥',
      viewersTitle: 'Viewers'
    },
    items: [
      { name: 'Thunderbolt', icon: '⚡', color: '#ef4444' },
      { name: 'Silver Star', icon: '⭐', color: '#94a3b8' },
      { name: 'Blazing Comet', icon: '☄️', color: '#f97316' },
      { name: 'Shadow Runner', icon: '🌑', color: '#64748b' },
      { name: 'Golden Hoof', icon: '🏆', color: '#eab308' },
      { name: 'Midnight Storm', icon: '🌪️', color: '#3b82f6' },
      { name: 'Emerald Breeze', icon: '🍃', color: '#10b981' },
      { name: 'Crimson Fury', icon: '🔥', color: '#dc2626' },
      { name: 'Iron Will', icon: '🛡️', color: '#71717a' },
      { name: 'Solar Flare', icon: '☀️', color: '#f59e0b' },
      { name: 'Mystic Dream', icon: '🔮', color: '#8b5cf6' },
      { name: 'Neon Dash', icon: '⚡', color: '#06b6d4' },
      { name: 'Wild Mustang', icon: '🐎', color: '#d97706' },
      { name: 'Phantom Ghost', icon: '👻', color: '#a855f7' },
      { name: 'Vortex Jet', icon: '🌀', color: '#0284c7' },
      { name: 'Frost Bite', icon: '❄️', color: '#38bdf8' },
      { name: 'Ruby Rocket', icon: '🚀', color: '#e11d48' },
      { name: 'Thunder Clap', icon: '🌩️', color: '#6366f1' },
      { name: 'Desert Mirage', icon: '🏜️', color: '#ca8a04' },
      { name: 'Apex Predator', icon: '🦁', color: '#f43f5e' }
    ]
  },
  {
    id: 'arena_8',
    name: '⚔️ 8-Fighter Arena',
    title: '⚔️ Gladiator Champions Arena',
    panelsConfig: {
      raceEmoji: '⚔️',
      entrantsEmoji: '🛡️',
      entrantsTitle: 'Fighters',
      viewersEmoji: '👥',
      viewersTitle: 'Spectators'
    },
    items: [
      { name: 'Valkyrie', icon: '⚔️', color: '#ef4444' },
      { name: 'Warlock', icon: '🔮', color: '#8b5cf6' },
      { name: 'Berserker', icon: '🪓', color: '#f97316' },
      { name: 'Paladin', icon: '🛡️', color: '#eab308' },
      { name: 'Shadow Assassin', icon: '🗡️', color: '#64748b' },
      { name: 'Archmage', icon: '✨', color: '#3b82f6' },
      { name: 'Beastmaster', icon: '🐺', color: '#10b981' },
      { name: 'Cyber Ninja', icon: '⚡', color: '#06b6d4' }
    ]
  },
  {
    id: 'duel_2',
    name: '🔴 Red vs Blue Duel',
    title: '🔴 Red vs Blue Duel',
    panelsConfig: {
      raceEmoji: '🔴',
      entrantsEmoji: '🥊',
      entrantsTitle: 'Contenders',
      viewersEmoji: '👥',
      viewersTitle: 'Audience'
    },
    items: [
      { name: 'Team Crimson', icon: '🔴', color: '#ef4444' },
      { name: 'Team Cobalt', icon: '🔵', color: '#3b82f6' }
    ]
  }
];

export const createOutcomesFromPreset = (preset: BuiltinPresetDef): BetOutcome[] => {
  return preset.items.map((item, idx) => ({
    id: String(idx + 1),
    number: idx + 1,
    name: item.name,
    color: item.color,
    icon: item.icon,
    totalBet: 0,
    bettorCount: 0,
    odds: 1.0,
    percentage: 0,
    isLocked: false,
  }));
};

export const createOutcomesFromSaved = (preset: SavedPreset): BetOutcome[] => {
  return preset.outcomes.map((o, idx) => ({
    ...o,
    number: idx + 1,
    totalBet: 0,
    bettorCount: 0,
    odds: 1.0,
    percentage: 0,
    isLocked: false,
  }));
};
