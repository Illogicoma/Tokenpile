# 🏇 AnyToken (Tokenpile) 🪙
### Real-Time Interactive Stream Racing, 3D Physics Betting & Twitch Extension Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitch TOS Compliant](https://img.shields.io/badge/Twitch%20TOS-100%25%20Compliant-9146FF?logo=twitch&logoColor=white)](https://twitch.tv)
[![Zero Cloud Backend](https://img.shields.io/badge/Backend-Zero%20Cloud%20Cost-10b981)](#-zero-cloud-cost-architecture)
[![React 19 + Three.js](https://img.shields.io/badge/Tech-React%2019%20%7C%20Three.js%20%7C%20Rapier-38bdf8)](https://react.dev)

**AnyToken** is a high-performance, zero-backend interactive stream widget and official **Twitch Panel Extension**. It turns stream predictions, horse racing, chat minigames, and tournaments into a tactile physical experience where viewer bets drop as physical 3D minted coins into an on-stream hopper with dynamic odds, real-time audio, and winner celebration podiums.

---

## ✨ Key Features

- **🪙 Dual 2D / 3D Physics Token Engine**:
  - **3D Mode**: GPU-accelerated rigid-body simulation with Three.js & Rapier physics. Tokens realistically tumble, clink, roll, and settle inside a customizable hopper.
  - **2D Mode**: Lightweight, ultra-efficient canvas physics powered by Matter.js for potato PCs and minimal CPU usage.
- **👾 Official Twitch Panel & Mobile Extension**:
  - Viewers get a personal, interactive bet slip directly under the stream player without cluttering chat.
  - Supports dark and light Twitch theme mirroring, custom coin previews, and 1-tap Twitch identity verification.
- **📡 Zero-Cost Twitch PubSub Synchronisation**:
  - Broadcasts contest state, runner odds, and winners to thousands of concurrent viewers using Twitch Extension PubSub.
  - **No external server, no Firebase database quotas, and zero hosting costs.**
- **📺 OBS Studio Dual Sync (0ms CEF Shared Engine)**:
  - Transparent 1080p stream overlay runs in OBS as a Browser Source.
  - Broadcaster controls the entire session from an OBS Custom Browser Dock via local `BroadcastChannel` with 0ms latency.
- **🎨 3D Minted Token Studio**:
  - Viewers customize their own tactile 3D coins with custom emojis, metallic sheens, roughness, and color tints.
  - Real-time drag-to-spin preview in both mobile and desktop panels.
- **🛡️ Stream Safety & Input Sanitization**:
  - Viewer token inputs are strictly sanitized (`isImageSource`) to prevent remote URL injections, cross-site scripting (XSS), or malicious image files from appearing on stream.
  - Administrative commands (`!lock`, `!open`, `!reset`) strictly enforce broadcaster/moderator badges.
- **🎭 Modular Skin & Sound System**:
  - Easily swap or create custom themes with custom CSS variables, typography, sounds, and runner skins.

---

## 🎮 How It Works for Streamers

```
                ┌───────────────────────────────────────┐
                │        Broadcaster Control Dock       │
                │        (OBS Dock / Web Browser)       │
                └───────┬───────────────────────┬───────┘
                        │                       │
      Local BroadcastChannel (0ms)     Twitch Extension PubSub
                        │                       │
                        ▼                       ▼
      ┌─────────────────────────────┐   ┌─────────────────────────────┐
      │     OBS Stream Overlay      │   │   Twitch Viewer Panels      │
      │  (1080p Transparent Stage)  │   │   (Live Mobile / Web Slips) │
      └─────────────────────────────┘   └─────────────────────────────┘
```

1. **Broadcaster Opens the Dock**: Manage entrant horses, set odds modes (Auto Pari-Mutuel or Fixed), adjust prize pools, and lock bets.
2. **Viewers Place Bets**: Viewers select horses and stake virtual points via their Twitch extension panel or Twitch chat commands (`!bet <runner> <amount>`).
3. **Tokens Drop on Stream**: Coins drop into the physical hopper in real time, making audible clinks as the pool builds.
4. **Race Resolution**: The streamer selects the winner or podium finishers. Winning coins burst in celebration and payouts are awarded automatically!

---

## 🎬 OBS Studio Setup

You can display the transparent race stage in OBS while controlling the session directly from an OBS dock with **zero third-party servers**:

### 1. Transparent Stream Overlay
1. In OBS Studio, under **Sources**, click **+** → **Browser Source**.
2. **Source Name**: `AnyToken Overlay`
3. **URL**: `https://<your-username>.github.io/<your-repo-name>/?obs=1`  *(or your local/custom URL with `?obs=1`)*
4. **Width**: `1920`, **Height**: `1080`
5. Check **Shutdown source when not visible** and click **OK**.

### 2. Broadcaster Custom Browser Dock
1. In OBS Studio, go to the top menu: **Docks** → **Custom Browser Docks...**
2. **Dock Name**: `AnyToken Admin`
3. **URL**: `https://<your-username>.github.io/<your-repo-name>/`
4. Click **Apply** and dock the panel anywhere in your OBS workspace.
5. **Real-Time Sync**: Because both the Browser Source and Custom Dock run inside OBS's built-in Chromium (CEF) process, they communicate locally with zero latency!

---

## 👾 Twitch Extension Setup

AnyToken includes dedicated multi-page HTML entry points designed specifically for the Twitch Developer Console:

| View Type | Entry Path | Recommended Dimensions | Description |
| :--- | :--- | :--- | :--- |
| **Panel** | `panel.html` | Width: `318px`, Height: `500px` | Runs directly under the video player on channel pages. |
| **Mobile** | `viewer.html` | Responsive | Native view in the official Twitch Mobile app. |
| **Config** | `config.html` | Flexible | Broadcaster setup panel in the Twitch Creator Dashboard. |
| **Live Dashboard** | `config.html` | Flexible | Live control panel inside Twitch Stream Manager. |

> Detailed step-by-step Twitch Developer Console instructions are available in [docs/TWITCH_EXTENSION_SETUP.md](docs/TWITCH_EXTENSION_SETUP.md).

---

## 💬 Twitch Chat Bot Commands

In addition to the visual Twitch panel, AnyToken connects to Twitch IRC anonymously without requiring stream keys or bot passwords:

### Viewer Commands
| Command | Usage | Description |
| :--- | :--- | :--- |
| `!bet` | `!bet 1 500` or `!bet Thunderbolt 250` | Stake virtual points on a horse. |
| `!join` | `!join` | Enter the current session and receive starting tokens. |
| `!token` | `!token ⚡` | Set your lucky coin emoji for drops. |
| `!leave` | `!leave` | Withdraw from the active session. |

### Broadcaster / Moderator Commands
*(Restricted to Broadcasters and Mods via Twitch IRC badges)*
| Command | Usage | Description |
| :--- | :--- | :--- |
| `!lock` | `!lock` | Lock bets before the race begins. |
| `!open` | `!open` | Reopen betting for the next race. |
| `!reset` | `!reset` | Reset contest pools and entrant standings. |
| `!give` | `!give @viewer 1000` | Award virtual points to a viewer. |

---

## 🛡️ Privacy, Legalities & Twitch TOS

- **100% Virtual Entertainment**: AnyToken points are strictly virtual game tokens with **zero cash value**. They cannot be bought, sold, or redeemed for cash, Bits, or Channel Points, ensuring 100% compliance with Twitch's Developer Services Agreement and simulated gambling laws.
- **Zero Cloud Tracking**: All user data, bet history, and token customizations reside exclusively in the client's local `localStorage`. No personal data or cookies are transmitted to third-party databases.
- Full privacy documentation is available in [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## 🎨 Themes & Custom Skins

All themes are modular packages stored inside `src/styles/<ThemeName>/`:
- `src/styles/Default/`:
  - `tokens.css`: Color palettes, gradients, surfaces, and shadows
  - `horseCards.css`, `topbar.css`, `oddsBar.css`, `celebration.css`, `iconPicker.css`, `viewerCards.css`
  - `Images/`: Brand logos (`tp_logo.png`, `tp_ico.png`) and victory headers (`tp_victory.png`)
  - `Sounds/`: Audio overrides (`token_clink.mp3`, `bet_drop.mp3`, `winner_fanfare.mp3`, etc.)

To create a new theme:
1. Duplicate `src/styles/Default/` to a new folder (e.g. `src/styles/Cyberpunk/`).
2. Customize only the assets you wish to override (omitted files cascade back to `Default`).
3. Select your new theme in **Settings** → **Visual Skin Theme Package**!

---

## 🛠️ Local Development

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd AnyToken

# 2. Install dependencies
npm install

# 3. Start development server with HTTPS (required for Twitch iframe testing)
npm run dev

# 4. Compile and bundle multi-page production package
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for streamers, developers, and communities to use and customize.
