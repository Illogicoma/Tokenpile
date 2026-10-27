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
  Sparkles,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { twitchExtensionService } from '../services/twitchExtensionService';
import { streamRelayService } from '../services/streamRelayService';
import { storageService } from '../services/storageService';
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
  const [adminPasscode, setAdminPasscode] = useState<string>(() => storageService.getAdminPasscode());
  const [showPasscode, setShowPasscode] = useState(false);

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
        if (parsed.adminPasscode) {
          setAdminPasscode(parsed.adminPasscode);
          storageService.saveAdminPasscode(parsed.adminPasscode);
        }
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
    if (adminPasscode.trim()) {
      storageService.saveAdminPasscode(adminPasscode.trim());
    }
    const configData = {
      configured: true,
      startingTokens,
      minBet,
      maxBet,
      houseName,
      adminPasscode: adminPasscode.trim(),
      updatedAt: Date.now()
    };

    const success = twitchExtensionService.setConfiguration('broadcaster', '1.0', configData);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 5000);
    } else {
      // In local testing outside Twitch iframe, save to localStorage so configuration test still works
      try {
        localStorage.setItem('TokenPile_twitch_ext_config', JSON.stringify(configData));
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

  return (
    <div className="config-view-container" style={{
      minHeight: '100%',
      width: '100%',
      backgroundColor: 'var(--bg-color, #EDE8DF)',
      backgroundImage: `
        radial-gradient(circle at 15% 15%, var(--bg-radial-1, rgba(244, 114, 182, 0.08)) 0%, transparent 45%),
        radial-gradient(circle at 85% 20%, var(--bg-radial-2, rgba(72, 188, 0, 0.06)) 0%, transparent 45%),
        radial-gradient(circle at 50% 90%, var(--bg-radial-3, rgba(251, 191, 36, 0.08)) 0%, transparent 50%)
      `,
      color: 'var(--text-primary, #5A4A28)',
      fontFamily: "var(--font-family-base, 'Twemoji Country Flags', 'Inter', system-ui, -apple-system, sans-serif)",
      padding: '2.5rem 1.25rem 4rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      boxSizing: 'border-box'
    }}>
      <div className="cosmos-panel" style={{
        maxWidth: '780px',
        width: '100%',
        backgroundColor: 'var(--card-bg, #F1F0E4)',
        border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.28))',
        borderRadius: '16px',
        boxShadow: 'var(--card-shadow-elevated, 0 10px 30px rgba(90, 74, 40, 0.18))',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🐎</span>
              <h1 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-title, #7D6B42)',
                fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)",
                letterSpacing: '-0.3px'
              }}>
                TokenPile • Twitch Extension Configuration
              </h1>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #8E7D53)' }}>
              Official Broadcaster Configuration View &amp; Real-Time PubSub Diagnostics
            </p>
          </div>

          {onExitConfig && (
            <button
              type="button"
              onClick={onExitConfig}
              className="cyber-btn-secondary"
              style={{
                backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                color: 'var(--text-primary, #5A4A28)',
                border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.25))',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              Open GM Dashboard
            </button>
          )}
        </div>

        {/* Live Twitch Status Banner */}
        <div style={{
          backgroundColor: isTwitchExt ? 'rgba(81, 207, 0, 0.12)' : 'rgba(245, 158, 11, 0.14)',
          border: `1.5px solid ${isTwitchExt ? 'rgba(60, 174, 2, 0.35)' : 'rgba(217, 119, 6, 0.35)'}`,
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Radio size={22} color={isTwitchExt ? '#3cae02' : '#d97706'} className={isTwitchExt ? 'spin-slow' : ''} />
            <div>
              <div style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: isTwitchExt ? '#2f8c01' : '#b45309',
                fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)"
              }}>
                {isTwitchExt ? 'Twitch Extension SDK Active & Connected' : 'Local / Preview Mode (Outside Twitch Iframe)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)', marginTop: '0.2rem' }}>
                Channel ID: <strong style={{ color: 'var(--text-primary, #5A4A28)', fontFamily: 'var(--font-family-mono, monospace)' }}>{channelId || 'Local Test Channel'}</strong> • Role: <strong style={{ color: 'var(--text-primary, #5A4A28)' }}>{role}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendTestPing}
            style={{
              background: testPingSent ? 'var(--accent-green-grad, linear-gradient(180deg, #51cf00 0%, #3cae02 50%, #2f8c01 100%))' : 'var(--card-bg-elevated, #FDFCF7)',
              color: testPingSent ? '#ffffff' : 'var(--text-primary, #5A4A28)',
              border: `1.5px solid ${testPingSent ? '#2f8c01' : 'var(--card-border, rgba(125, 107, 66, 0.3))'}`,
              borderRadius: '8px',
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}
          >
            {testPingSent ? <Check size={14} /> : <RefreshCw size={14} />}
            <span>{testPingSent ? 'Ping Broadcasted!' : 'Send Test PubSub Ping'}</span>
          </button>
        </div>

        {/* Configuration Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--text-title, #7D6B42)',
            fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)",
            margin: 0
          }}>
            Viewer Defaults &amp; House Rules
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Starting Points */}
            <div style={{
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
              padding: '1rem',
              borderRadius: '10px',
              border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
              boxShadow: 'var(--well-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.16))'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #8E7D53)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Viewer Starting Points
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={16} color="var(--accent-gold, #d97706)" />
                <input
                  type="number"
                  value={startingTokens}
                  onChange={e => setStartingTokens(Math.max(100, parseInt(e.target.value) || 0))}
                  style={{
                    backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                    border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.3))',
                    color: 'var(--text-primary, #5A4A28)',
                    fontFamily: 'var(--font-family-mono, monospace)',
                    borderRadius: '7px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    width: '100%',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                  }}
                />
              </div>
            </div>

            {/* Min Bet */}
            <div style={{
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
              padding: '1rem',
              borderRadius: '10px',
              border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
              boxShadow: 'var(--well-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.16))'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #8E7D53)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Minimum Bet
              </label>
              <input
                type="number"
                value={minBet}
                onChange={e => setMinBet(Math.max(1, parseInt(e.target.value) || 0))}
                style={{
                  backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                  border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.3))',
                  color: 'var(--text-primary, #5A4A28)',
                  fontFamily: 'var(--font-family-mono, monospace)',
                  borderRadius: '7px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                }}
              />
            </div>

            {/* Max Bet */}
            <div style={{
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
              padding: '1rem',
              borderRadius: '10px',
              border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
              boxShadow: 'var(--well-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.16))'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #8E7D53)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Maximum Bet
              </label>
              <input
                type="number"
                value={maxBet}
                onChange={e => setMaxBet(Math.max(10, parseInt(e.target.value) || 0))}
                style={{
                  backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                  border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.3))',
                  color: 'var(--text-primary, #5A4A28)',
                  fontFamily: 'var(--font-family-mono, monospace)',
                  borderRadius: '7px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                }}
              />
            </div>

            {/* House / Channel Name */}
            <div style={{
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
              padding: '1rem',
              borderRadius: '10px',
              border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
              boxShadow: 'var(--well-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.16))'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #8E7D53)', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Broadcaster Identity
              </label>
              <input
                type="text"
                value={houseName}
                onChange={e => setHouseName(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                  border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.3))',
                  color: 'var(--text-primary, #5A4A28)',
                  borderRadius: '7px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                }}
              />
            </div>

            {/* Streamer Admin Passcode */}
            <div style={{
              backgroundColor: 'var(--well-bg, rgba(217, 217, 217, 0.52))',
              padding: '1rem',
              borderRadius: '10px',
              border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
              boxShadow: 'var(--well-shadow, inset 0 1px 2px rgba(0, 0, 0, 0.16))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #8E7D53)', letterSpacing: '0.5px' }}>
                  Admin Passcode
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted, #8E7D53)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}
                  title={showPasscode ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showPasscode ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPasscode ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} color="var(--accent-gold, #d97706)" />
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={adminPasscode}
                  onChange={e => setAdminPasscode(e.target.value)}
                  placeholder="Set GM passcode..."
                  style={{
                    backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
                    border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.3))',
                    color: 'var(--text-primary, #5A4A28)',
                    fontFamily: 'var(--font-family-mono, monospace)',
                    borderRadius: '7px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    width: '100%',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8E7D53)', marginTop: '-0.35rem', lineHeight: 1.4 }}>
            🔒 The <strong>Admin Passcode</strong> protects point grants, entrant customization, and race resolution on stream so viewers cannot tamper with your controls.
          </div>

          {/* Save Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: 'var(--accent-gold-grad, linear-gradient(180deg, #fbbf24 0%, #d97706 100%))',
                color: '#ffffff',
                border: '1px solid #b45309',
                borderBottom: '3px solid #92400e',
                borderRadius: '10px',
                padding: '0.75rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)"
              }}
            >
              <Save size={18} />
              <span>Save &amp; Mark Extension Configured</span>
            </button>

            {isSaved && (
              <span style={{ color: '#2f8c01', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} />
                <span>Configuration Saved to Twitch Segment! Ready to Activate.</span>
              </span>
            )}

            {saveError && (
              <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                <AlertCircle size={18} />
                <span>{saveError}</span>
              </span>
            )}
          </div>
        </div>

        {/* Twitch Views & Copy URLs */}
        <div style={{ borderTop: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--text-title, #7D6B42)',
            fontFamily: "var(--font-family-display, 'Twemoji Country Flags', 'Merge One', system-ui, sans-serif)",
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Tv size={18} color="var(--accent-purple, #9333ea)" />
            <span>Twitch Developer Console View Paths</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Panel View */}
            <div style={{
              backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
              border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.22))',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-title, #7D6B42)' }}>Panel Viewer Path (318px under stream player)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)', fontFamily: 'var(--font-family-mono, monospace)' }}>index.html?mode=panel</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('panel', panelUrl)}
                style={{
                  backgroundColor: copiedKey === 'panel' ? '#3cae02' : 'var(--well-bg, rgba(217, 217, 217, 0.52))',
                  color: copiedKey === 'panel' ? '#ffffff' : 'var(--text-primary, #5A4A28)',
                  border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                {copiedKey === 'panel' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'panel' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* Mobile View */}
            <div style={{
              backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
              border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.22))',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-title, #7D6B42)' }}>Mobile Viewer Path (Twitch Mobile App)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)', fontFamily: 'var(--font-family-mono, monospace)' }}>index.html?mode=viewer</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('viewer', viewerUrl)}
                style={{
                  backgroundColor: copiedKey === 'viewer' ? '#3cae02' : 'var(--well-bg, rgba(217, 217, 217, 0.52))',
                  color: copiedKey === 'viewer' ? '#ffffff' : 'var(--text-primary, #5A4A28)',
                  border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                {copiedKey === 'viewer' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'viewer' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* Config View */}
            <div style={{
              backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
              border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.22))',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-title, #7D6B42)' }}>Config Path (Broadcaster Extension Config Modal)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)', fontFamily: 'var(--font-family-mono, monospace)' }}>index.html?mode=config</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('config', `${baseUrl}?mode=config`)}
                style={{
                  backgroundColor: copiedKey === 'config' ? '#3cae02' : 'var(--well-bg, rgba(217, 217, 217, 0.52))',
                  color: copiedKey === 'config' ? '#ffffff' : 'var(--text-primary, #5A4A28)',
                  border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                {copiedKey === 'config' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'config' ? 'Copied Full URL' : 'Copy Full URL'}</span>
              </button>
            </div>

            {/* OBS Custom Browser Dock URL */}
            <div style={{
              backgroundColor: 'var(--card-bg-elevated, #FDFCF7)',
              border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.22))',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-title, #7D6B42)' }}>OBS Custom Browser Dock (Control GM Mode inside OBS)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)', fontFamily: 'var(--font-family-mono, monospace)' }}>index.html</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('dashboard', `${baseUrl}`)}
                style={{
                  backgroundColor: copiedKey === 'dashboard' ? '#3cae02' : 'var(--well-bg, rgba(217, 217, 217, 0.52))',
                  color: copiedKey === 'dashboard' ? '#ffffff' : 'var(--text-primary, #5A4A28)',
                  border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                {copiedKey === 'dashboard' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'dashboard' ? 'Copied Full URL' : 'Copy Dock URL'}</span>
              </button>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div style={{
          borderTop: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
          paddingTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--text-muted, #8E7D53)'
        }}>
          <span>TokenPile v1.0 • Zero Cloud Cost Twitch PubSub</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={13} color="var(--accent-gold, #d97706)" />
            <span>Virtual Points Only • 100% Twitch TOS Compliant</span>
          </span>
        </div>
      </div>
    </div>
  );
};
