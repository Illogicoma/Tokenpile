import React, { useState } from 'react';
import {
  ShieldCheck,
  Settings,
  Trophy,
  Sliders,
  X,
  Sparkles,
  Coffee,
  ExternalLink,
  ChevronRight,
  Lock,
  Radio,
  Tv,
  CheckCircle2
} from 'lucide-react';
import { styleService } from '../services/styleService';
import { storageService } from '../services/storageService';
import { soundEffects } from '../services/soundEffects';
import tpLogoFallback from '../styles/Default/Images/tp_logo.png';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGMUnlock?: () => void;
  onOpenSettings?: () => void;
  isAdmin?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenGMUnlock,
  onOpenSettings,
  isAdmin = false
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      storageService.setSeenOnboarding(true);
    }
    soundEffects.playTokenClink();
    onClose();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      storageService.setSeenOnboarding(true);
    }
    onClose();
  };

  const handleUnlockGM = () => {
    if (dontShowAgain) {
      storageService.setSeenOnboarding(true);
    }
    onClose();
    onOpenGMUnlock?.();
  };

  const handleGoSettings = () => {
    if (dontShowAgain) {
      storageService.setSeenOnboarding(true);
    }
    onClose();
    onOpenSettings?.();
  };

  const logoSrc = styleService.getImage('tp_logo.png') || tpLogoFallback;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSkip();
      }}
      style={{ zIndex: 120 }}
    >
      <div
        className="cosmos-panel onboarding-modal-container"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          background: 'var(--card-bg, #F1F0E4)',
          border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.35))',
          borderRadius: 'var(--app-radius-lg, 16px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          animation: 'modalEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Close Icon */}
        <button
          onClick={handleSkip}
          aria-label="Close Guide"
          title="Close Guide"
          style={{
            position: 'absolute',
            top: '0.85rem',
            right: '0.85rem',
            background: 'var(--well-bg, rgba(0, 0, 0, 0.05))',
            border: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))',
            borderRadius: '999px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted, #8E7D53)',
            transition: 'all 0.15s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--well-bg, rgba(0, 0, 0, 0.05))';
            e.currentTarget.style.color = 'var(--text-muted, #8E7D53)';
          }}
        >
          <X size={15} />
        </button>

        {/* Modal Scrollable Body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '1.4rem 1.6rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}
        >
          {/* Hero Header with Logo */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: '0.4rem', maxWidth: '320px', display: 'flex', justifyContent: 'center' }}>
              <img
                src={logoSrc}
                alt="TokenPile"
                style={{
                  maxHeight: '74px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.18))'
                }}
              />
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-gold, #d97706)',
                fontFamily: "'Merge One', system-ui, sans-serif",
                marginBottom: '0.2rem'
              }}
            >
              Interactive Stream Racing &amp; 3D Physics Betting Engine
            </div>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-secondary, #6B5B37)',
                margin: 0,
                maxWidth: '480px',
                lineHeight: 1.45
              }}
            >
              Welcome! TokenPile drops viewer predictions as physical 3D coins directly on your stream. Here is everything you need to get up and running:
            </p>
          </div>

          {/* Quickstart Feature Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {/* 1. GM Mode */}
            <div
              style={{
                background: 'var(--well-bg, rgba(0, 0, 0, 0.03))',
                border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                borderRadius: 'var(--app-radius, 10px)',
                padding: '0.85rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ShieldCheck size={14} color="#10b981" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)' }}>
                    1. Enable GM Mode
                  </span>
                </div>
                {isAdmin ? (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <CheckCircle2 size={10} /> Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnlockGM}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Lock size={10} /> Unlock
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted, #8E7D53)', lineHeight: 1.4 }}>
                TokenPile opens in safe <strong>Viewer Mode</strong> by default. Click the <strong>GM / Viewer</strong> badge in the top bar to unlock broadcaster controls and settings (default passcode: <code>admin123</code>).
              </p>
            </div>

            {/* 2. Settings & Twitch */}
            <div
              style={{
                background: 'var(--well-bg, rgba(0, 0, 0, 0.03))',
                border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                borderRadius: 'var(--app-radius, 10px)',
                padding: '0.85rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Settings size={14} color="#a855f7" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)' }}>
                    2. Twitch &amp; OBS Setup
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGoSettings}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <Radio size={10} /> Settings
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted, #8E7D53)', lineHeight: 1.4 }}>
                Open <strong>Settings</strong> (⚙️) to connect Twitch chat bots anonymously, customize commands (<code>!bet</code>, <code>!lock</code>, <code>!give</code>, <code>!odds</code>), and get your <strong>OBS Overlay</strong> and <strong>Twitch Extension</strong> URLs.
              </p>
            </div>

            {/* 3. Racers & Presets */}
            <div
              style={{
                background: 'var(--well-bg, rgba(0, 0, 0, 0.03))',
                border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                borderRadius: 'var(--app-radius, 10px)',
                padding: '0.85rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trophy size={14} color="#f59e0b" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)' }}>
                  3. Edit Entrants &amp; Presets
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted, #8E7D53)', lineHeight: 1.4 }}>
                Click any entrant in the right sidebar to edit names, numbers, odds, or custom runner icons. Use the <strong>Presets</strong> dropdown in the top bar to swap instantly between Horses, Marbles, and custom rosters.
              </p>
            </div>

            {/* 4. Controls, Hopper & Debug Mode */}
            <div
              style={{
                background: 'var(--well-bg, rgba(0, 0, 0, 0.03))',
                border: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.22))',
                borderRadius: 'var(--app-radius, 10px)',
                padding: '0.85rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(6, 182, 212, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sliders size={14} color="#06b6d4" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)' }}>
                  4. Physics, Hopper &amp; Debug Mode
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted, #8E7D53)', lineHeight: 1.4 }}>
                Use the <strong>Controls</strong> tray to switch between 2D &amp; 3D physics, calibrate hopper bounds, and customize theme colors. In the Viewers panel, toggle <strong>Debug Mode</strong> to test viewer bet drops anytime!
              </p>
            </div>
          </div>

          {/* OBS Studio Dual Setup Tip */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.22)',
              borderRadius: 'var(--app-radius-sm, 8px)',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #6B5B37)'
            }}
          >
            <Tv size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div>
              <strong>Streaming with OBS Studio?</strong> Add <code>obs.html</code> as a transparent Browser Source overlay, or dock this admin window directly into OBS via <em>Docks → Custom Browser Docks</em> for 0ms local sync!
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '0.85rem 1.6rem 1rem',
            background: 'var(--well-bg, rgba(0, 0, 0, 0.03))',
            borderTop: '1.5px solid var(--well-border, rgba(125, 107, 66, 0.2))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Main Action Buttons & Don't Show Again */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            {/* Checkbox: Don't show again */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted, #8E7D53)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-gold, #d97706)' }}
              />
              <span>Don&apos;t show this guide on startup</span>
            </label>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="cyber-btn-secondary"
                onClick={handleSkip}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Skip Tour
              </button>
              <button
                type="button"
                className="cyber-btn-primary"
                onClick={handleFinish}
                style={{
                  padding: '0.4rem 1.1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={14} />
                <span>Get Started</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Creator Support Ko-Fi Link (Subtle & Elegant) */}
          <div
            style={{
              paddingTop: '0.65rem',
              borderTop: '1px dashed var(--well-border, rgba(125, 107, 66, 0.22))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.74rem',
              color: 'var(--text-muted, #8E7D53)'
            }}
          >
            <Coffee size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>Enjoying TokenPile? Support the project on</span>
            <a
              href="https://ko-fi.com/illogicoma"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-primary, #5A4A28)',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.12rem 0.45rem',
                borderRadius: '5px',
                border: '1px solid rgba(245, 158, 11, 0.28)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)';
              }}
            >
              <span>ko-fi.com/illogicoma</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
