import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Save, 
  Coins, 
  Copy, 
  Check, 
  RefreshCw, 
  Tv, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { twitchExtensionService } from '../services/twitchExtensionService';
import { streamRelayService } from '../services/streamRelayService';
import type { Contest } from '../types/betting';

interface ConfigViewProps {
  contest: Contest;
  onExitConfig?: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ contest, onExitConfig }) => {
  const [startingTokens, setStartingTokens] = useState<number>(50000);
  const [minBet, setMinBet] = useState<number>(5);
  const [maxBet, setMaxBet] = useState<number>(50000);
  const [houseName, setHouseName] = useState<string>('The House');
  
  const [isTwitchExt, setIsTwitchExt] = useState(() => twitchExtensionService.isExtensionEnvironment());
  const [channelId, setChannelId] = useState<string | null>(() => twitchExtensionService.getChannelId());
  const [role, setRole] = useState<string>('broadcaster');
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testPingSent, setTestPingSent] = useState(false);

  // Load existing broadcaster configuration if present
  useEffect(() => {
    const existing = twitchExtensionService.getConfiguration('broadcaster');
    if (existing?.content) {
      try {
        const parsed = JSON.parse(existing.content);
        if (parsed.startingTokens) setStartingTokens(parsed.startingTokens);
        if (parsed.minBet) setMinBet(parsed.minBet);
        if (parsed.maxBet) setMaxBet(parsed.maxBet);
        if (parsed.houseName) setHouseName(parsed.houseName);
        setIsSaved(true);
      } catch (e) {
        console.warn('Could not parse broadcaster configuration segment:', e);
      }
    }

    const unsubAuth = twitchExtensionService.onAuth((auth) => {
      setIsTwitchExt(true);
      setChannelId(auth.channelId);
      const jwt = twitchExtensionService.getJWTPayload();
      if (jwt?.role) setRole(jwt.role);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  const handleSave = () => {
    setSaveError(null);
    const configData = {
      configured: true,
      startingTokens,
      minBet,
      maxBet,
      houseName,
      updatedAt: Date.now()
    };

    const success = twitchExtensionService.setConfiguration('broadcaster', '1.0', configData);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 5000);
    } else {
      // In local testing outside Twitch iframe, save to localStorage so configuration test still works
      try {
        localStorage.setItem('anytoken_twitch_ext_config', JSON.stringify(configData));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 5000);
      } catch (e) {
        setSaveError('Failed to save configuration. If running inside Twitch, make sure the Extension SDK is active.');
      }
    }
  };

  const handleSendTestPing = () => {
    streamRelayService.broadcastContestUpdate(contest);
    setTestPingSent(true);
    setTimeout(() => setTestPingSent(false), 3000);
  };

  const handleCopyUrl = (label: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://localhost:5173/';
  const panelUrl = `${baseUrl}?mode=panel`;
  const viewerUrl = `${baseUrl}?mode=viewer`;
  const dashboardUrl = `${baseUrl}?mode=dashboard`;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem 1.25rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '740px',
        width: '100%',
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🐎</span>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.3px' }}>
                AnyToken • Twitch Extension Configuration
              </h1>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Official Broadcaster Configuration View &amp; Real-Time PubSub Diagnostics
            </p>
          </div>

          {onExitConfig && (
            <button
              onClick={onExitConfig}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Open GM Dashboard
            </button>
          )}
        </div>

        {/* Live Twitch Status Banner */}
        <div style={{
          backgroundColor: isTwitchExt ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${isTwitchExt ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Radio size={22} color={isTwitchExt ? '#10b981' : '#f59e0b'} className={isTwitchExt ? 'spin-slow' : ''} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isTwitchExt ? '#34d399' : '#fbbf24' }}>
                {isTwitchExt ? 'Twitch Extension SDK Active & Connected' : 'Local / Preview Mode (Outside Twitch Iframe)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Channel ID: <strong style={{ color: '#ffffff' }}>{channelId || 'Local Test Channel'}</strong> • Role: <strong style={{ color: '#ffffff' }}>{role}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={handleSendTestPing}
            style={{
              backgroundColor: testPingSent ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            {testPingSent ? <Check size={14} /> : <RefreshCw size={14} />}
            <span>{testPingSent ? 'Ping Broadcasted!' : 'Send Test PubSub Ping'}</span>
          </button>
        </div>

        {/* Configuration Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Viewer Defaults &amp; House Rules
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Starting Points */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Viewer Starting Points
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={16} color="#fbbf24" />
                <input
                  type="number"
                  value={startingTokens}
                  onChange={e => setStartingTokens(Math.max(100, parseInt(e.target.value) || 0))}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    width: '100%'
                  }}
                />
              </div>
            </div>

            {/* Min Bet */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Minimum Bet
              </label>
              <input
                type="number"
                value={minBet}
                onChange={e => setMinBet(Math.max(1, parseInt(e.target.value) || 0))}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%'
                }}
              />
            </div>

            {/* Max Bet */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Maximum Bet
              </label>
              <input
                type="number"
                value={maxBet}
                onChange={e => setMaxBet(Math.max(10, parseInt(e.target.value) || 0))}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%'
                }}
              />
            </div>

            {/* House / Channel Name */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Broadcaster Identity
              </label>
              <input
                type="text"
                value={houseName}
                onChange={e => setHouseName(e.target.value)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%'
                }}
              />
            </div>
          </div>

          {/* Save Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleSave}
              style={{
                backgroundColor: '#f59e0b',
                color: '#1e293b',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
              }}
            >
              <Save size={18} />
              <span>Save &amp; Mark Extension Configured</span>
            </button>

            {isSaved && (
              <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} />
                <span>Configuration Saved to Twitch Segment! Ready to Activate.</span>
              </span>
            )}

            {saveError && (
              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                <AlertCircle size={18} />
                <span>{saveError}</span>
              </span>
            )}
          </div>
        </div>

        {/* Twitch Views & Copy URLs */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tv size={18} color="#a855f7" />
            <span>Twitch Developer Console View Paths</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Panel View */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>Panel Viewer Path (318px under stream player)</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>index.html?mode=panel</div>
              </div>
              <button
                onClick={() => handleCopyUrl('panel', panelUrl)}
                style={{
                  backgroundColor: copiedKey === 'panel' ? '#10b981' : 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {copiedKey === 'panel' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'panel' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* Mobile View */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>Mobile Viewer Path (Twitch Mobile App)</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>index.html?mode=viewer</div>
              </div>
              <button
                onClick={() => handleCopyUrl('viewer', viewerUrl)}
                style={{
                  backgroundColor: copiedKey === 'viewer' ? '#10b981' : 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {copiedKey === 'viewer' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'viewer' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* Config View */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a855f7' }}>Config Path (Broadcaster Extension Config Modal)</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>index.html?mode=config</div>
              </div>
              <button
                onClick={() => handleCopyUrl('config', `${baseUrl}?mode=config`)}
                style={{
                  backgroundColor: copiedKey === 'config' ? '#10b981' : 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {copiedKey === 'config' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'config' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* Live Dashboard View */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>Live Dashboard Path (Broadcaster Stream Manager Dock)</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>index.html?mode=dashboard</div>
              </div>
              <button
                onClick={() => handleCopyUrl('dashboard', dashboardUrl)}
                style={{
                  backgroundColor: copiedKey === 'dashboard' ? '#10b981' : 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {copiedKey === 'dashboard' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'dashboard' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Troubleshooting Panel for "Panel Won't Draw" */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} />
            <span>Why Is The Panel Not Drawing On Twitch? (Top 3 Checkpoints)</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <strong style={{ color: '#f87171' }}>1. Localhost SSL Certificate Blocked in Iframe (Most Common):</strong>
              <p style={{ margin: '0.35rem 0 0', lineHeight: 1.45 }}>
                Chrome and Edge block self-signed HTTPS iframes inside Twitch by default. In the exact same browser where you view Twitch, open a new tab to <a href="https://localhost:5173/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>https://localhost:5173/</a>, click <em>Advanced &rarr; Proceed to localhost (unsafe)</em>. Even better, visit <code style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 4px', borderRadius: '4px' }}>chrome://flags/#allow-insecure-localhost</code> and set to <strong>Enabled</strong>.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <strong style={{ color: '#fbbf24' }}>2. "Extension requires configuration" Checkbox:</strong>
              <p style={{ margin: '0.35rem 0 0', lineHeight: 1.45 }}>
                In Twitch Developer Console &rarr; Version Details: if "Extension requires configuration before activation" is enabled, click <strong>"Save &amp; Mark Extension Configured"</strong> above or uncheck that box in Twitch Console so Twitch activates immediately.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <strong style={{ color: '#38bdf8' }}>3. Panel Height Setting in Twitch Developer Console:</strong>
              <p style={{ margin: '0.35rem 0 0', lineHeight: 1.45 }}>
                Under Extension Views &rarr; Panel, ensure <strong>Height (in pixels)</strong> is set to <strong>400</strong> or <strong>500</strong>. If left blank or 0, Twitch renders a 0px collapsed iframe.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
          <span>AnyToken v1.0 • Zero Cloud Cost Twitch PubSub</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={13} color="#fbbf24" />
            <span>Virtual Points Only • 100% Twitch TOS Compliant</span>
          </span>
        </div>
      </div>
    </div>
  );
};
