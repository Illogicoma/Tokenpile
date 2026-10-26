# Theme Sound Effects Directory

Drop your custom audio files (`.mp3`, `.wav`, `.ogg`) into this directory (or inside any custom skin folder, e.g. `src/styles/Scifi/Sounds/`) to replace TokenPile's sound effects for this theme.

### How Theme Audio Works:
1. **Skin Priority**: TokenPile looks for sound files in your currently active skin (`src/styles/<ActiveSkin>/Sounds/`).
2. **Default Fallback**: If a sound isn't in your active skin, it automatically falls back to `src/styles/Default/Sounds/`.
3. **Procedural Synthesizer**: If no sound file exists anywhere, TokenPile uses zero-latency procedural Web Audio synthesis so sound effects always work out of the box!

### Supported Sound Cue Filenames:
- `token_clink.mp3` (or `.wav`, `.ogg`): Played when chips clink or quick bet drops
- `bet_drop.mp3`: Swoosh and heavy impact when dropping a batch of tokens
- `lock.mp3`: Dramatic lock sound when betting closes
- `winner_fanfare.mp3`: Victory celebration melody when crowning a winning racer
- `cashout.mp3`: Payout / coin register sound when winnings are distributed
- `lose.mp3`: Minor defeat tone when losing bets resolve
- `shine.mp3`: Shimmer / lens flare sweep sound
- `tally_tick.mp3`: Rapid coin tick while user points count up

All files can be stereo or mono `.mp3`, `.wav`, or `.ogg`.
