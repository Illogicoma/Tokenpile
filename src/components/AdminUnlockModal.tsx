import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, X, KeyRound, Lock, Unlock, Check } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  onUnlock: (passcode: string) => boolean;
  onLock: () => void;
  onUpdatePasscode: (oldPass: string, newPass: string) => boolean;
}

export const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({
  isOpen,
  onClose,
  isUnlocked,
  onUnlock,
  onLock,
  onUpdatePasscode
}) => {
  const [inputPass, setInputPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputPass('');
      setErrorMsg('');
      setIsChangingPass(false);
      setOldPass('');
      setNewPass('');
      setChangeSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPass.trim()) return;

    const success = onUnlock(inputPass.trim());
    if (success) {
      soundEffects.playCashout();
      onClose();
    } else {
      setErrorMsg('Incorrect passcode. Please try again.');
      soundEffects.playLockBuzzer();
    }
  };

  const handleLockNow = () => {
    onLock();
    soundEffects.playTokenClink();
    onClose();
  };

  const handleChangePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim()) return;

    const success = onUpdatePasscode(oldPass.trim(), newPass.trim());
    if (success) {
      setChangeSuccess(true);
      soundEffects.playCashout();
      setTimeout(() => {
        setIsChangingPass(false);
        setChangeSuccess(false);
        setOldPass('');
        setNewPass('');
      }, 1500);
    } else {
      setErrorMsg('Current passcode incorrect.');
      soundEffects.playLockBuzzer();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cosmos-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--app-radius, 14px)',
          background: 'var(--card-bg, #F1F0E4)',
          border: '1.5px solid var(--card-border, rgba(125, 107, 66, 0.35))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          animation: 'modalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          color: 'var(--text-primary, #5A4A28)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isUnlocked ? 'rgba(22, 163, 74, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                border: `1.5px solid ${isUnlocked ? 'rgba(22, 163, 74, 0.35)' : 'rgba(217, 119, 6, 0.35)'}`
              }}
            >
              {isUnlocked ? (
                <ShieldCheck size={20} color="#16a34a" />
              ) : (
                <ShieldAlert size={20} color="#d97706" />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-family-display, sans-serif)' }}>
                {isUnlocked ? 'Admin Controls Unlocked' : 'Streamer Access Control'}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--text-muted, #8E7D53)' }}>
                {isUnlocked
                  ? 'Full GM controls are currently active on this device'
                  : 'Enter passcode to unlock point grants and race controls'}
              </p>
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Close window">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {isUnlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem'
              }}
            >
              <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                <strong>You have full Broadcaster / Admin access.</strong>
                <div style={{ color: 'var(--text-muted, #8E7D53)', marginTop: '0.2rem' }}>
                  Entrant editor, odds manipulation, point modifications, and race lifecycle controls are completely unlocked.
                </div>
              </div>
            </div>

            {/* Change Passcode Option */}
            {isChangingPass ? (
              <form onSubmit={handleChangePassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    className="cyber-input"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Current passcode..."
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    New Passcode
                  </label>
                  <input
                    type="password"
                    className="cyber-input"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New secure passcode..."
                    required
                  />
                </div>

                {errorMsg && (
                  <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                    {errorMsg}
                  </span>
                )}

                {changeSuccess && (
                  <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={13} /> Passcode successfully updated!
                  </span>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
                  <button type="button" className="cyber-btn-ghost mini-btn" onClick={() => setIsChangingPass(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cyber-btn-primary mini-btn">
                    Save New Passcode
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="cyber-btn-ghost mini-btn"
                  onClick={() => {
                    setIsChangingPass(true);
                    setErrorMsg('');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <KeyRound size={13} /> Change Passcode
                </button>

                <button
                  type="button"
                  className="cyber-btn-secondary mini-btn"
                  onClick={handleLockNow}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                >
                  <Lock size={13} /> Lock Controls (Viewer Mode)
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                padding: '0.75rem 0.95rem',
                borderRadius: '8px',
                background: 'var(--well-bg, rgba(217, 217, 217, 0.42))',
                border: '1px solid var(--well-border, rgba(125, 107, 66, 0.2))',
                fontSize: '0.74rem',
                color: 'var(--text-muted, #8E7D53)',
                lineHeight: 1.45
              }}
            >
              🔒 <strong>Viewer Mode Active:</strong> Stream controls are locked to prevent unauthorized changes to points, horses, or race outcomes. Enter your Streamer Passcode below to unlock GM controls.
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                Streamer Passcode
              </label>
              <input
                type="password"
                className="cyber-input"
                style={{ width: '100%', fontSize: '0.95rem', padding: '0.5rem 0.75rem' }}
                placeholder="Enter passcode..."
                value={inputPass}
                onChange={(e) => {
                  setInputPass(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)', marginTop: '0.25rem', display: 'block' }}>
                Default passcode is <code>admin123</code> (can be customized once unlocked).
              </span>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(220, 38, 38, 0.12)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  color: '#dc2626',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button type="button" className="cyber-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="cyber-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Unlock size={14} /> Unlock Controls
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
