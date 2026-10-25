# Tokenpile (AnyToken) 🏇🪙
### Real-Time Interactive Stream Betting & Physics Prediction Widget

Tokenpile is a lightweight, zero-backend stream widget designed for Twitch and YouTube creators. Viewers can place token bets on races, tournaments, and stream challenges with live dynamic odds, real-time 3D physics token drops, celebration podiums, and customizable skins.

---

## 🚀 Free Hosting on GitHub Pages (Zero Server Setup)

Tokenpile runs 100% in the client browser—**no Node.js backend, Docker container, or database is required**.

### Quick Deploy:
1. **Push to GitHub**: Upload this repository to your GitHub account (`main` branch).
2. **Enable GitHub Pages**:
   - Go to your repository **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. **Automatic Deployment**:
   - The included workflow (`.github/workflows/deploy.yml`) will automatically build and publish your widget at:
   - `https://<your-github-username>.github.io/<your-repo-name>/`

---

## 🎬 OBS Studio Setup (Transparent Overlay + Controller Sync)

You can display the transparent race stage in OBS while controlling the session without third-party servers.

### The OBS Custom Dock Workflow:
1. **Add the Controller Dock**:
   - In OBS Studio, go to the top menu: **Docks** → **Custom Browser Docks...**
   - **Dock Name**: `Tokenpile Admin`
   - **URL**: `https://<your-username>.github.io/<your-repo-name>/`
   - Click **Apply** and dock the panel into your OBS layout.
2. **Add the Transparent Stream Overlay**:
   - In your OBS Scene, click **+** under Sources → **Browser Source**.
   - **Source Name**: `Tokenpile Overlay`
   - **URL**: `https://<your-username>.github.io/<your-repo-name>/?obs=1`
   - **Width**: `1920`, **Height**: `1080`
   - Click **OK**.
3. **How It Works**:
   - Because both the Browser Source and Custom Browser Dock run inside OBS's built-in Chromium (CEF) process, they share the **same session and `BroadcastChannel` in real time with 0ms latency**!
   - Placing bets, closing races, or awarding prizes in your dock updates the transparent stream overlay instantly.

---

## 🎨 Themes & Custom Skins

All themes are modular packages stored inside `src/styles/<ThemeName>/`:
- `src/styles/Default/`:
  - `fonts.css`: Typography and font family variables
  - `tokens.css`: Colors, surfaces, border radiuses, and shadows
  - `horseCards.css`, `topbar.css`, `oddsBar.css`, `celebration.css`, `iconPicker.css`, `viewerCards.css`
  - `Images/`: Brand logos (`tp_logo.png`, `tp_ico.png`) and victory headers (`tp_victory.png`)
  - `Sounds/`: Audio overrides (`token_clink.mp3`, `bet_drop.mp3`, `winner_fanfare.mp3`, etc.)

To create a new theme:
1. Duplicate `src/styles/Default/` to a new folder (e.g. `src/styles/Scifi/`).
2. Customize only the files you want to change (any omitted files automatically cascade back to `Default`).
3. Select your new theme in **Settings** → **Visual Skin Theme Package**!

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build
```
