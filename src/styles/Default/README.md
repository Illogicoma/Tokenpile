# AnyToken Skin Theme Package: Default

This folder defines the baseline design system, stylesheets, graphical assets, and sound effects for AnyToken.

### Folder Structure:
- `fonts.css`: Typography definitions, `@font-face` loaders, and font family variables (`--font-family-display`, `--font-family-body`)
- `tokens.css`: Core design tokens (color variables, glassmorphism filters, border radiuses, glow effects)
- `topbar.css`: Styles for the top navigation header, betting status pills, and action controls
- `oddsBar.css`: Live odds bar, percentage meters, and multiplier tags
- `horseCards.css`: Racer / entrant podium cards, avatar badges, token pile chips, betting indicators
- `viewerCards.css`: Active viewer / bettor cards, wager amounts, and chat avatar pills
- `celebration.css`: Victory celebration modal, crown badges, winner cards, and particle fx
- `iconPicker.css`: Icon picker modal, emoji style toggles, folder explorer, and link libraries
- `components.css`: General UI buttons, modals, dropdowns, inputs, and utility classes
- `Images/`: Theme images and graphical assets:
  - `tp_victory.png`: Victory banner header artwork
  - `tp_logo.png`: App brand logo
  - `tp_logo_long.png`: Horizontal brand banner
  - `tp_ico.png`: App hero icon / browser tab favicon
  - (Any custom racer icons, viewer avatars, or category logos)
- `Sounds/`: Theme audio sound clips (`.mp3`, `.wav`, `.ogg`):
  - `token_clink.mp3`, `bet_drop.mp3`, `winner_fanfare.mp3`, `lock.mp3`, `cashout.mp3`, `lose.mp3`, `shine.mp3`, `tally_tick.mp3`

### Creating a Custom Theme:
1. Duplicate this entire folder: e.g. copy `src/styles/Default` to `src/styles/Scifi` or `src/styles/Cyberpunk`.
2. Edit or delete whatever you want!
   - You only need to include the files you wish to change.
   - Any missing `.css` rule, image, or sound file will **automatically cascade and fall back to `Default`**.
3. Open AnyToken Settings -> **Skin Theme Package** -> Select your new theme!
