import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Palette, Check, X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Environment as DreiEnvironment } from '@react-three/drei';
import type { UserTokenConfig, UserRosterItem, MaterialPreset } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { storageService } from '../services/storageService';
import { IconPicker } from './IconPicker';
import { IconDisplay, isImageSource, isFlagEmoji, getFlagSvgUrl } from './IconDisplay';

interface TokenMakerModalProps {
  user: UserRosterItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, config: UserTokenConfig) => void;
}

const PRESET_STYLES = [
  { name: 'Chrome Mirror', metalness: 1.0, roughness: 0.05, finish: 'chrome', colorTint: '#f1f5f9' },
  { name: 'Pure Gold', metalness: 0.95, roughness: 0.15, finish: 'gem', colorTint: '#fbbf24' },
  { name: 'Neon Cyber', metalness: 0.4, roughness: 0.3, finish: 'neon', colorTint: '#06b6d4' },
  { name: 'Matte Clay', metalness: 0.0, roughness: 0.9, finish: 'matte', colorTint: '#e2e8f0' },
  { name: 'Obsidian Sheen', metalness: 0.7, roughness: 0.2, finish: 'standard', colorTint: '#334155' },
];

/**
 * Shape-Extruded 3D Token Preview:
 * Takes the exact silhouette of imported PNGs, GIFs, WebPs, or emojis,
 * and extrudes them in 3D complete with a raised, radiant metallic highlight outline.
 */
const MiniVoxelPreview = ({ emoji, config }: { emoji: string; config: UserTokenConfig }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const isFlag = isFlagEmoji(emoji);
  const isImg = isImageSource(emoji) || isFlag;
  const effectiveSrc = isFlag ? getFlagSvgUrl(emoji) : emoji;
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Asynchronously load custom image and update state so 3D preview re-renders instantly
  useEffect(() => {
    if (!isImg || !effectiveSrc) {
      setLoadedImage(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (active) setLoadedImage(img);
    };
    img.onerror = () => {
      if (active) setLoadedImage(null);
    };
    img.src = effectiveSrc;
    return () => {
      active = false;
    };
  }, [effectiveSrc, isImg]);

  const geometry = useMemo(() => {
    const size = 16; // 16x16 = 256 voxel grid resolution (reduced from 1,024 for 4x faster rendering and low memory)
    const voxelSize = 1.7 / size;
    const rimThickness = 0.38;
    const innerThickness = 0.26;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return new THREE.BoxGeometry(1.5, 1.5, rimThickness);

    ctx.clearRect(0, 0, size, size);

    if (isImg && loadedImage) {
      // Draw image scaled to fit with margin for the highlight outline
      const margin = 1;
      const targetDim = size - margin * 2;
      const scale = Math.min(targetDim / loadedImage.naturalWidth, targetDim / loadedImage.naturalHeight);
      const drawW = Math.max(1, Math.round(loadedImage.naturalWidth * scale));
      const drawH = Math.max(1, Math.round(loadedImage.naturalHeight * scale));
      const drawX = Math.round((size - drawW) / 2);
      const drawY = Math.round((size - drawH) / 2);
      ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);
    } else if (!isImg) {
      // Draw emoji with margin for the highlight outline
      ctx.font = `${Math.round(size * 0.70)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji || '⚡', size / 2, size / 2 + 1);
    } else {
      // Still loading image: fallback placeholder box
      return new THREE.BoxGeometry(1.4, 1.4, rimThickness);
    }

    let imgData: Uint8ClampedArray;
    try {
      imgData = ctx.getImageData(0, 0, size, size).data;
    } catch {
      return new THREE.BoxGeometry(1.5, 1.5, rimThickness);
    }

    // Helper to inspect pixel colors
    const getPixel = (px: number, py: number) => {
      const i = (py * size + px) * 4;
      return { r: imgData[i], g: imgData[i + 1], b: imgData[i + 2], a: imgData[i + 3] };
    };

    // Check if the 4 corners are solid and uniform (e.g. solid white or black JPG background)
    const cTL = getPixel(0, 0);
    const cTR = getPixel(size - 1, 0);
    const cBL = getPixel(0, size - 1);
    const cBR = getPixel(size - 1, size - 1);
    const isSolidBg = isImg && 
      cTL.a > 240 && cTR.a > 240 && cBL.a > 240 && cBR.a > 240 &&
      Math.abs(cTL.r - cTR.r) < 15 && Math.abs(cTL.g - cTR.g) < 15 && Math.abs(cTL.b - cTR.b) < 15 &&
      Math.abs(cTL.r - cBL.r) < 15 && Math.abs(cTL.g - cBL.g) < 15 && Math.abs(cTL.b - cBL.b) < 15;

    const isPixelSolid = (px: number, py: number) => {
      const i = (py * size + px) * 4;
      const a = imgData[i + 3];
      if (a < 35) return false;
      if (isSolidBg) {
        const dr = Math.abs(imgData[i] - cTL.r);
        const dg = Math.abs(imgData[i + 1] - cTL.g);
        const db = Math.abs(imgData[i + 2] - cTL.b);
        if (dr < 25 && dg < 25 && db < 25) return false;
      }
      return true;
    };

    // 1. Identify solid pixels
    const solidGrid = new Uint8Array(size * size);
    let solidCount = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isPixelSolid(x, y)) {
          solidGrid[y * size + x] = 1;
          solidCount++;
        }
      }
    }

    if (solidCount === 0) {
      return new THREE.BoxGeometry(1.5, 1.5, rimThickness);
    }

    // 2. Identify shape-hugging outline pixels (8-neighborhood)
    const outlineGrid = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (solidGrid[y * size + x]) continue;
        let isNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              if (solidGrid[ny * size + nx]) {
                isNeighbor = true;
                break;
              }
            }
          }
          if (isNeighbor) break;
        }
        if (isNeighbor) {
          outlineGrid[y * size + x] = 1;
        }
      }
    }

    // 3. Highlight colors for the metallic outline
    const baseTint = new THREE.Color(config.colorTint || '#fbbf24');
    const glowTint = baseTint.clone().lerp(new THREE.Color('#ffffff'), 0.75);
    const shadowTint = baseTint.clone().multiplyScalar(0.40);

    // 4. Construct extruded 3D voxels
    const geometries: THREE.BufferGeometry[] = [];
    const baseInnerVoxel = new THREE.BoxGeometry(voxelSize, voxelSize, innerThickness);
    const baseOutlineVoxel = new THREE.BoxGeometry(voxelSize, voxelSize, rimThickness);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isInner = solidGrid[y * size + x] === 1;
        const isBorder = outlineGrid[y * size + x] === 1;
        if (!isInner && !isBorder) continue;

        const voxel = (isBorder ? baseOutlineVoxel : baseInnerVoxel).clone();
        voxel.translate((x - size / 2) * voxelSize, -(y - size / 2) * voxelSize, 0);

        const count = voxel.attributes.position.count;
        const colors = new Float32Array(count * 3);

        if (isBorder) {
          // Specular metallic lighting gradient from top-left to bottom-right
          const t = (x + y) / (size * 2);
          const c = new THREE.Color();
          if (t < 0.45) {
            c.copy(glowTint).lerp(baseTint, t / 0.45);
          } else {
            c.copy(baseTint).lerp(shadowTint, (t - 0.45) / 0.55);
          }
          for (let i = 0; i < count; i++) {
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          }
        } else {
          const idx = (y * size + x) * 4;
          const r = imgData[idx] / 255;
          const g = imgData[idx + 1] / 255;
          const b = imgData[idx + 2] / 255;
          for (let i = 0; i < count; i++) {
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
          }
        }

        voxel.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometries.push(voxel);
      }
    }

    if (geometries.length === 0) return new THREE.BoxGeometry(1.5, 1.5, rimThickness);
    const merged = mergeGeometries(geometries, false);
    merged.computeVertexNormals();
    return merged;
  }, [emoji, isImg, loadedImage, config.colorTint]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.4;
      meshRef.current.rotation.x = 0.20; // Subtle 11-degree forward tilt so 3D depth and raised rim are clearly visible
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        vertexColors={true}
        metalness={config.metalness} 
        roughness={config.roughness}
      />
    </mesh>
  );
};

export const TokenMakerModal = ({ user, isOpen, onClose, onSave }: TokenMakerModalProps) => {
  const [draftConfig, setDraftConfig] = useState<UserTokenConfig>({ ...user.config });
  const [customPresets, setCustomPresets] = useState<MaterialPreset[]>([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load user-saved material presets from local storage
  useEffect(() => {
    setCustomPresets(storageService.getCustomMaterialPresets());
  }, []);

  const allPresets: MaterialPreset[] = useMemo(() => {
    const defaults: MaterialPreset[] = PRESET_STYLES.map((s, idx) => ({
      id: `default_${idx}`,
      name: s.name,
      metalness: s.metalness,
      roughness: s.roughness,
      colorTint: s.colorTint,
      finish: s.finish,
      isCustom: false,
    }));
    return [...customPresets, ...defaults];
  }, [customPresets]);

  if (!isOpen) return null;

  const isDefaultEditor = user.id === 'default_app_token';
  const isViewersIconEditor = user.id === 'viewers_panel_icon';
  const isEntrantsIconEditor = user.id === 'entrants_panel_icon';
  const isRaceIconEditor = user.id === 'race_icon';
  const isPanelIconEditor = isViewersIconEditor || isEntrantsIconEditor || isRaceIconEditor;

  const handleApplyPreset = (style: MaterialPreset | typeof PRESET_STYLES[0]) => {
    setDraftConfig(prev => ({
      ...prev,
      metalness: style.metalness,
      roughness: style.roughness,
      finish: (style.finish as any) || 'standard',
      colorTint: style.colorTint,
    }));
    soundEffects.playTokenClink();
  };

  const handleSaveCustomPreset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newPresetName.trim();
    if (!name) return;

    const updated = storageService.saveCustomMaterialPreset({
      name,
      metalness: draftConfig.metalness,
      roughness: draftConfig.roughness,
      colorTint: draftConfig.colorTint || '#ffffff',
      finish: draftConfig.finish || 'standard',
    });
    setCustomPresets(updated);
    setNewPresetName('');
    setIsSavingPreset(false);
    soundEffects.playTokenClink();
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.deleteCustomMaterialPreset(id);
    setCustomPresets(updated);
    soundEffects.playTokenClink();
  };

  const handleSetAsDefault = () => {
    storageService.saveDefaultToken(draftConfig);
    soundEffects.playCashout();
    alert('This token style has been saved as the default for all new viewers joining chat!');
  };

  const handleSave = () => {
    if (isDefaultEditor) {
      storageService.saveDefaultToken(draftConfig);
    } else if (!isPanelIconEditor) {
      storageService.saveUserToken(user.name, draftConfig);
    }
    onSave(user.id, draftConfig);
    soundEffects.playCashout();
    onClose();
  };

  if (isPanelIconEditor) {
    return (
      <div className="modal-backdrop">
        <div className="token-maker-modal" style={{ maxWidth: '580px', width: '92%' }}>
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="header-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' }}>
                <Palette size={20} color="#0284c7" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                  {isViewersIconEditor
                    ? 'Viewers Panel Icon'
                    : isEntrantsIconEditor
                    ? `${user.name || 'Entrants'} Panel Icon`
                    : 'Race Contest Icon'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)' }}>
                  {isViewersIconEditor
                    ? 'Choose an icon or custom image for the Viewers section header'
                    : isEntrantsIconEditor
                    ? `Choose an icon or custom image for the ${user.name || 'Entrants'} section header`
                    : 'Choose an icon or custom image for the Race Title bar'}
                </p>
              </div>
            </div>
            <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Modal Body: Clean 2D selection */}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: 'calc(85vh - 130px)' }}>
            {/* Live 2D Header Mockup Preview */}
            <div className="panel-header-preview-box">
              <span className="preview-label">
                <Sparkles size={11} color="#d97706" /> Live Panel Header Preview
              </span>
              <div className="panel-preview-row">
                <div className="cyber-nav-btn btn-icon-only panel-icon-btn" style={{ pointerEvents: 'none' }}>
                  <span className="panel-icon-emoji">
                    <IconDisplay icon={draftConfig.emoji} fallback={isViewersIconEditor ? '👥' : isEntrantsIconEditor ? '🏇' : '🏆'} />
                  </span>
                </div>
                <div className="panel-preview-title">
                  {user.name}
                </div>
              </div>
            </div>

            {/* 3-Tab Icon Picker (Emojis, Local PNG/GIFs, Web Links) */}
            <div className="control-group">
              <label className="section-label">Select Icon / Custom Graphic</label>
              <IconPicker
                value={draftConfig.emoji}
                onChange={(newVal) => {
                  setDraftConfig(prev => ({ ...prev, emoji: newVal }));
                  soundEffects.playTokenClink();
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button 
              className="cyber-btn-ghost" 
              onClick={() => setDraftConfig({ ...user.config })}
            >
              <RotateCcw size={14} /> Reset
            </button>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="cyber-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="cyber-btn-primary" onClick={handleSave}>
                <Check size={16} /> Save Icon
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="token-maker-modal">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="header-icon-badge">
              <Palette size={20} color="#a855f7" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary, #5A4A28)', fontFamily: "'Merge One', system-ui, sans-serif" }}>
                {isDefaultEditor
                  ? 'Channel Default Token Forge'
                  : 'Token Forge Workshop'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8E7D53)' }}>
                {isDefaultEditor ? (
                  'Configuring the default token for all new viewers joining chat'
                ) : (
                  <>Customizing 3D Voxel Token for <strong style={{ color: '#0284c7' }}>{user.name}</strong></>
                )}
              </p>
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Modal Body */}
        <div className="token-maker-body">
          {/* Left Column: 3D Live Rotating Viewport */}
          <div className="preview-column">
            <div className="preview-canvas-card">
              <div className="canvas-header-label">
                <Sparkles size={14} color="#f59e0b" /> LIVE 3D VOXEL PREVIEW
              </div>
              <div style={{ width: '100%', height: '220px' }}>
                <Canvas camera={{ position: [0, 0, 3.8], fov: 45 }}>
                  <DreiEnvironment preset="city" />
                  <ambientLight intensity={1.5} />
                  <directionalLight position={[4, 5, 4]} intensity={2.0} />
                  <pointLight position={[-3, -2, -2]} intensity={1.2} color="#a855f7" />
                  <MiniVoxelPreview emoji={draftConfig.emoji} config={draftConfig} />
                </Canvas>
              </div>
              <div className="preview-stats">
                <span className="stat-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Symbol: <IconDisplay icon={draftConfig.emoji} style={{ width: '13px', height: '13px' }} />
                </span>
                <span className="stat-pill">Metal: {Math.round(draftConfig.metalness * 100)}%</span>
                <span className="stat-pill">Rough: {Math.round(draftConfig.roughness * 100)}%</span>
              </div>
            </div>

            {/* Quick Material Presets */}
            <div className="material-presets-section">
              <div className="section-label-row">
                <label className="section-label" style={{ marginBottom: 0 }}>Material Presets</label>
                <button
                  type="button"
                  className="save-preset-btn"
                  onClick={() => setIsSavingPreset(v => !v)}
                  title="Save current Color, Metallic, and Roughness as a reusable preset"
                >
                  <Plus size={11} /> Save Preset
                </button>
              </div>

              {/* Save Preset Inline Form */}
              {isSavingPreset && (
                <form onSubmit={handleSaveCustomPreset} className="preset-save-drawer">
                  <div className="preset-save-header">
                    <span className="preset-save-title">Save Custom Material</span>
                    <span className="preset-save-badges">
                      <span className="preset-color-dot" style={{ backgroundColor: draftConfig.colorTint || '#ffffff' }} />
                      <span>M: {Math.round(draftConfig.metalness * 100)}%</span>
                      <span>R: {Math.round(draftConfig.roughness * 100)}%</span>
                    </span>
                  </div>
                  <div className="preset-save-input-row">
                    <input
                      type="text"
                      placeholder="Preset Name (e.g. Rose Gold)..."
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      className="cyber-input preset-name-input"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="cyber-btn-primary mini-btn"
                      disabled={!newPresetName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="preset-cancel-btn"
                      onClick={() => {
                        setIsSavingPreset(false);
                        setNewPresetName('');
                      }}
                    >
                      &times;
                    </button>
                  </div>
                </form>
              )}

              {/* Presets Grid */}
              <div className="preset-grid">
                {allPresets.map(style => {
                  const isActive = 
                    Math.abs(draftConfig.metalness - style.metalness) < 0.02 &&
                    Math.abs(draftConfig.roughness - style.roughness) < 0.02 &&
                    (draftConfig.colorTint || '#ffffff').toLowerCase() === (style.colorTint || '#ffffff').toLowerCase();

                  return (
                    <div 
                      key={style.id || style.name} 
                      className={`preset-chip ${isActive ? 'is-active' : ''} ${style.isCustom ? 'is-custom' : ''}`}
                      onClick={() => handleApplyPreset(style)}
                      title={`Apply "${style.name}" (Metal: ${Math.round(style.metalness * 100)}%, Rough: ${Math.round(style.roughness * 100)}%)`}
                    >
                      <span className="preset-color-dot" style={{ backgroundColor: style.colorTint }} />
                      <span className="preset-name">{style.name}</span>

                      <div className="preset-meta-tags">
                        <span className="preset-spec-pill">
                          M:{Math.round(style.metalness * 100)}% R:{Math.round(style.roughness * 100)}%
                        </span>

                        {style.isCustom && (
                          <button
                            type="button"
                            className="preset-delete-btn"
                            onClick={(e) => handleDeleteCustomPreset(style.id!, e)}
                            title={`Delete "${style.name}" preset`}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="controls-column">
            {/* Symbol / Emoji / Image Selector */}
            <div className="control-group">
              <label className="section-label">Select Symbol / Custom Token Image</label>
              <IconPicker
                value={draftConfig.emoji}
                onChange={(newVal) => {
                  setDraftConfig(prev => ({ ...prev, emoji: newVal }));
                  soundEffects.playTokenClink();
                }}
              />
            </div>

            {/* Material Sliders */}
            <div className="control-group">
              <label className="section-label">Surface Material Physics</label>
              
              <div className="slider-row">
                <div className="slider-label-bar">
                  <span>Metallic Luster</span>
                  <span className="mono-val">{(draftConfig.metalness * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={draftConfig.metalness}
                  onChange={e => setDraftConfig(p => ({ ...p, metalness: parseFloat(e.target.value) }))}
                  className="cyber-range"
                />
              </div>

              <div className="slider-row">
                <div className="slider-label-bar">
                  <span>Roughness / Matte Finish</span>
                  <span className="mono-val">{(draftConfig.roughness * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={draftConfig.roughness}
                  onChange={e => setDraftConfig(p => ({ ...p, roughness: parseFloat(e.target.value) }))}
                  className="cyber-range"
                />
              </div>

              <div className="slider-row">
                <div className="slider-label-bar">
                  <span>Base Tint Color</span>
                  <span className="mono-val">{draftConfig.colorTint || '#ffffff'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={draftConfig.colorTint || '#ffffff'}
                    onChange={e => setDraftConfig(p => ({ ...p, colorTint: e.target.value }))}
                    style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['#ffffff', '#fbbf24', '#38bdf8', '#f43f5e', '#a855f7', '#22c55e'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setDraftConfig(p => ({ ...p, colorTint: c }))}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: draftConfig.colorTint === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="cyber-btn-ghost" 
              onClick={() => setDraftConfig({ ...user.config })}
            >
              <RotateCcw size={14} /> Reset
            </button>
            {!isPanelIconEditor && (
              <button 
                className="cyber-btn-ghost" 
                onClick={handleSetAsDefault}
                title="Save this appearance as default for all new chat viewers"
              >
                ⭐ Set as Default Token
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="cyber-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="cyber-btn-primary" onClick={handleSave}>
              <Check size={16} /> {isPanelIconEditor ? 'Save Icon' : 'Save Token'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
