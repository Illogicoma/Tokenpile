# Privacy Policy for AnyToken Twitch Extension

*Last Updated: October 2026*

This Privacy Policy explains how **AnyToken** ("we", "the Extension", or "the Service") handles information when you use our Twitch Extension on Twitch.tv or via the Twitch Mobile App.

---

## 1. Zero Cloud Data Collection & Local-First Philosophy
AnyToken is engineered with a **local-first, privacy-centric architecture**:
- **No Remote Database**: We do not maintain any central cloud database (such as Firebase, AWS, or Supabase).
- **No Third-Party Analytics**: We do not include Google Analytics, Facebook Pixel, advertising trackers, or tracking cookies.
- **No Sale of Personal Data**: We never sell, rent, monetize, or share your data with advertisers or third parties.

---

## 2. Information We Process
When you interact with the AnyToken Extension on Twitch:

### A. Twitch Identity Information (Optional)
- **Opaque User ID**: When you view the Extension, Twitch provides an anonymous, opaque identifier (`U...`) to distinguish unique participants.
- **Twitch User ID & Username**: If you explicitly click **"Link Twitch ID"**, the extension requests your permission via Twitch's official `requestIdShare()` prompt. If granted, your public Twitch username and user ID are used solely to label your custom 3D coin on stream and in the live bet slip.

### B. In-Game & Customization Choices
- **Token Design**: The emoji, metalness, roughness, and color tint you choose in the 3D Token Studio.
- **Simulated Bets & Points**: Your virtual point balance, active runner selections, and bet history.

---

## 3. How Information Is Stored & Transmitted

1. **Local Browser Storage (`localStorage`)**:
   Your token customizations, nickname, and virtual point balance are stored directly on your own device inside your browser's local sandbox. You can clear this data at any time by clearing your browser cache or clicking "Disconnect" in the extension top bar.

2. **Real-Time Transmission via Official Twitch PubSub**:
   When you place a bet or update your coin, the data is transmitted in real time directly to the broadcaster using **Twitch Extension PubSub** (`wss://pubsub-edge.twitch.tv`). No intermediary proxy server intercepts or stores this message.

---

## 4. Virtual Points & Non-Gambling Disclaimer
- **100% Virtual Entertainment**: AnyToken is a fun, simulated contest engine.
- **Zero Real-World Value**: All tokens, coins, and points are strictly virtual. They have no monetary value, cannot be redeemed for cash, and cannot be purchased with real money, Twitch Bits, or Channel Points.
- **TOS Compliance**: AnyToken strictly adheres to Twitch's Terms of Service and Developer Services Agreement regarding simulated gaming and gambling.

---

## 5. Security Measures
- **Input Sanitization**: All viewer token inputs are strictly sanitized (`isImageSource`) to prevent remote URL injections, cross-site scripting (XSS), or malicious image payloads from displaying on stream.
- **Cryptographic JWT Verification**: Twitch broadcaster and viewer roles are verified cryptographically via Twitch-signed JSON Web Tokens.

---

## 6. Your Rights & Data Deletion
Under GDPR, CCPA, and applicable global privacy regulations:
- You may revoke identity access at any time through your [Twitch Connections Settings](https://www.twitch.tv/settings/connections).
- Because all user data resides locally in your browser's `localStorage`, you can permanently delete all stored data simply by clearing site data for the extension or your browser storage.

---

## 7. Contact
For questions, support, or privacy inquiries regarding AnyToken, please open an issue in the official GitHub repository or contact the broadcaster on their Twitch channel.
